import { createClient } from '@supabase/supabase-js';

// Nimmt Filme, die Nutzer per Freitext analysiert haben und die noch nicht in trailers stehen, in die Liste auf.
// Quellen: search_log (Eingaben) und shared_results (von Claude erkannter Titel). Titel, Jahr und die Namen in
// Deutsch/Englisch/Spanisch kommen von TMDB; ohne sicheren Treffer wird nichts eingetragen (nur gemeldet).
// Trockenlauf ist Standard, geschrieben wird nur mit --write. Danach Trailer holen:
//   npx tsx --env-file=.env.local scripts/fetch-trailers.ts --write --only="<Titel>"
// Aufruf: npx tsx --env-file=.env.local scripts/import-freetext-films.ts [--write]
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const tmdbKey = process.env.TMDB_API_KEY;
const write = process.argv.includes('--write');

if (!supabaseUrl || !supabaseKey || !tmdbKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY und TMDB_API_KEY werden benötigt (.env.local).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: { transport: () => null as any },
});

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function tmdb(pathname: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`https://api.themoviedb.org/3${pathname}`);
  const headers: Record<string, string> = {};
  if (tmdbKey!.startsWith('eyJ')) headers.Authorization = `Bearer ${tmdbKey}`;
  else url.searchParams.set('api_key', tmdbKey!);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers });
  if (res.status === 401) {
    console.error('❌ TMDB lehnt den API-Key ab (401).');
    process.exit(1);
  }
  if (!res.ok) throw new Error(`TMDB ${res.status} für ${pathname}`);
  return res.json();
}

const yearOf = (r: any, kind: 'movie' | 'tv') => {
  const d: string | undefined = kind === 'movie' ? r.release_date : r.first_air_date;
  return d ? Number(d.slice(0, 4)) : null;
};

// Ohne Jahresangabe ist ein exakter Titel mehrdeutig (z.B. gleichnamige Filme von 1938 und 2013)
const MIN_POPULARITY = 5;

interface Candidate {
  typed: string;
  year: number | null;
  queries: string[];
}

async function run() {
  const { data: trailers, error } = await supabase
    .from('trailers')
    .select('film_name, name_de, name_en, name_es');
  if (error) throw error;
  const known = new Set<string>();
  for (const t of trailers ?? []) {
    for (const n of [t.film_name, t.name_de, t.name_en, t.name_es]) if (n) known.add(norm(n));
  }

  const { data: log } = await supabase.from('search_log').select('film_name, film_year');
  const { data: shared } = await supabase.from('shared_results').select('film_name, film_year, result');

  // pro eingegebenem Namen: Eingabe + von Claude erkannter Titel als Suchbegriffe
  const candidates = new Map<string, Candidate>();
  const knownList = [...known];
  const add = (typed: string, year: number | null, extra?: string) => {
    const key = norm(typed);
    if (!key || known.has(key)) return;
    // "die eiskönigin" ist nur eine Kurzform von "Die Eiskönigin – Völlig unverfroren"
    if (knownList.some((k) => k.startsWith(`${key} `) || key.startsWith(`${k} `))) {
      console.log(`⏭️  "${typed}" → Kurzform/Variante eines vorhandenen Titels, übersprungen`);
      return;
    }
    const c = candidates.get(key) ?? { typed, year, queries: [] };
    for (const q of [extra, typed]) if (q && !c.queries.includes(q)) c.queries.push(q);
    candidates.set(key, c);
  };
  for (const s of shared ?? []) {
    const canonical = typeof s.result?.filmName === 'string' ? s.result.filmName.replace(/\s*\(.*\)\s*$/, '') : undefined;
    add(s.film_name, s.film_year ?? null, canonical);
  }
  for (const l of log ?? []) add(l.film_name, l.film_year ?? null);

  console.log(`🔎 ${candidates.size} Freitext-Titel, die nicht in der Liste stehen${write ? ' (Schreibmodus)' : ' (Trockenlauf)'}\n`);

  const toInsert: any[] = [];
  for (const c of candidates.values()) {
    let resolved: { kind: 'movie' | 'tv'; hit: any } | null = null;
    const hints: string[] = [];
    for (const query of c.queries) {
      const wanted = new Set(c.queries.map(norm));
      for (const kind of ['movie', 'tv'] as const) {
        const data = await tmdb(`/search/${kind}`, { query, language: 'de-DE' });
        const hit = (data.results ?? []).find((r: any) => {
          const y = yearOf(r, kind);
          const titleOk = [r.title, r.name, r.original_title, r.original_name].some((t) => t && wanted.has(norm(t)));
          return titleOk && (c.year === null || y === null || Math.abs(y - c.year) <= 2);
        });
        if (hit && c.year === null && (hit.popularity ?? 0) < MIN_POPULARITY) {
          hints.push(`${hit.title ?? hit.name} (${yearOf(hit, kind) ?? '?'}, Popularität ${Math.round(hit.popularity ?? 0)}, zu unbekannt für automatische Aufnahme ohne Jahr)`);
        } else if (hit) { resolved = { kind, hit }; break; }
        hints.push(...(data.results ?? []).slice(0, 2).map((r: any) => `${r.title ?? r.name} (${yearOf(r, kind) ?? '?'})`));
      }
      if (resolved) break;
    }
    if (!resolved) {
      console.log(`❓ "${c.typed}" → kein sicherer TMDB-Treffer. Vorschläge: ${[...new Set(hints)].slice(0, 3).join(' | ') || 'keine'}`);
      continue;
    }

    const { kind, hit } = resolved;
    const [de, en, es] = await Promise.all(
      ['de-DE', 'en-US', 'es-ES'].map((language) => tmdb(`/${kind}/${hit.id}`, { language }))
    );
    const nameOf = (d: any) => (kind === 'movie' ? d.title : d.name) as string | undefined;
    const nameDe = nameOf(de) ?? c.typed;
    const row = {
      film_name: nameDe,
      film_name_normalized: nameDe.toLowerCase().trim(),
      film_year: yearOf(de, kind),
      youtube_id: null,
      fsk: null,
      type: kind === 'movie' ? 'movie' : 'series',
      streaming: null,
      verified: false,
      name_de: nameDe,
      name_en: nameOf(en) ?? null,
      name_es: nameOf(es) ?? null,
    };
    // Eingabe war nur eine andere Schreibweise eines schon gelisteten Films
    if ([row.name_de, row.name_en, row.name_es].some((n) => n && known.has(norm(n)))) {
      console.log(`⏭️  "${c.typed}" → entspricht schon vorhandenem Eintrag (${nameDe}, ${row.film_year})`);
      continue;
    }
    console.log(`✅ "${c.typed}" → ${nameDe} (${row.film_year}) | EN: ${row.name_en} | ES: ${row.name_es} [${row.type}, Popularität ${Math.round(hit.popularity ?? 0)}]`);
    toInsert.push(row);
    for (const n of [row.name_de, row.name_en, row.name_es]) if (n) known.add(norm(n));
  }

  if (write && toInsert.length > 0) {
    const { error: insError } = await supabase.from('trailers').insert(toInsert);
    if (insError) {
      console.error('❌ Eintragen fehlgeschlagen:', insError.message);
      process.exit(1);
    }
    console.log(`\n✅ ${toInsert.length} Einträge angelegt (ohne Trailer, unverifiziert)`);
  } else {
    console.log(`\n${toInsert.length} Einträge würden angelegt.${toInsert.length ? ' Zum Eintragen mit --write starten.' : ''}`);
  }
}

run();
