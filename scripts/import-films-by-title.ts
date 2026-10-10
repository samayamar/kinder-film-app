import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Nimmt Filme aus einer JSON-Datei ([{ "title": "...", "year": 2014 }]) in die Liste (trailers) auf.
// Titel, Jahr und die Namen in Deutsch/Englisch/Spanisch kommen von TMDB. Ein Titel wird nur übernommen, wenn TMDB einen
// Film mit exakt passendem Titel und Jahr (±2) findet; sonst wird er gemeldet und nichts eingetragen.
// Trockenlauf ist Standard, geschrieben wird nur mit --write. Danach Trailer holen (fetch-trailers.ts) und analysieren.
// Aufruf: npx tsx --env-file=.env.local scripts/import-films-by-title.ts --file=lib/data/preschool-films.json [--write]
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const tmdbKey = process.env.TMDB_API_KEY;
const write = process.argv.includes('--write');
const file = process.argv.find((a) => a.startsWith('--file='))?.slice('--file='.length);

if (!supabaseUrl || !supabaseKey || !tmdbKey || !file) {
  console.error('❌ Benötigt: .env.local (Supabase, TMDB_API_KEY) und --file=<Pfad zur JSON-Datei>.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, { realtime: { transport: () => null as any } });
const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function tmdb(pathname: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`https://api.themoviedb.org/3${pathname}`);
  const headers: Record<string, string> = {};
  if (tmdbKey!.startsWith('eyJ')) headers.Authorization = `Bearer ${tmdbKey}`;
  else url.searchParams.set('api_key', tmdbKey!);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`TMDB ${res.status} für ${pathname}`);
  return res.json();
}

async function run() {
  const wanted: { title: string; year: number }[] = JSON.parse(fs.readFileSync(path.resolve(file!), 'utf-8'));
  const { data: trailers, error } = await supabase.from('trailers').select('film_name, film_year, name_de, name_en, name_es');
  if (error) throw error;
  const known = new Set<string>();
  for (const t of trailers ?? []) for (const n of [t.film_name, t.name_de, t.name_en, t.name_es]) if (n) known.add(`${norm(n)}|${t.film_year}`);
  const knownNames = new Set<string>();
  for (const t of trailers ?? []) for (const n of [t.film_name, t.name_de, t.name_en, t.name_es]) if (n) knownNames.add(norm(n));

  console.log(`🔎 ${wanted.length} Titel${write ? ' (Schreibmodus)' : ' (Trockenlauf)'}\n`);
  const rows: any[] = [];
  for (const w of wanted) {
    const data = await tmdb('/search/movie', { query: w.title, language: 'de-DE' });
    const hit = (data.results ?? []).find((r: any) => {
      const y = r.release_date ? Number(r.release_date.slice(0, 4)) : null;
      const titleOk = [r.title, r.original_title].some((t: string) => t && norm(t) === norm(w.title));
      return titleOk && y !== null && Math.abs(y - w.year) <= 2;
    });
    if (!hit) {
      const hints = (data.results ?? []).slice(0, 2).map((r: any) => `${r.title} (${r.release_date?.slice(0, 4) ?? '?'})`).join(' | ');
      console.log(`❓ "${w.title}" (${w.year}) → kein sicherer Treffer. Vorschläge: ${hints || 'keine'}`);
      continue;
    }
    const [de, en, es] = await Promise.all(['de-DE', 'en-US', 'es-ES'].map((language) => tmdb(`/movie/${hit.id}`, { language })));
    const nameDe: string = de.title ?? w.title;
    const year = Number(String(de.release_date).slice(0, 4));
    const names = [de.title, en.title, es.title].filter(Boolean) as string[];
    if (names.some((n) => known.has(`${norm(n)}|${year}`)) || knownNames.has(norm(nameDe)) ) {
      console.log(`⏭️  "${w.title}" → schon in der Liste (${nameDe}, ${year})`);
      continue;
    }
    rows.push({
      film_name: nameDe,
      film_name_normalized: nameDe.toLowerCase().trim(),
      film_year: year,
      youtube_id: null,
      fsk: null,
      type: 'movie',
      streaming: null,
      verified: false,
      name_de: nameDe,
      name_en: en.title ?? null,
      name_es: es.title ?? null,
    });
    for (const n of names) { known.add(`${norm(n)}|${year}`); knownNames.add(norm(n)); }
    console.log(`✅ ${nameDe} (${year}) | EN: ${en.title} | ES: ${es.title}`);
    await sleep(60);
  }

  if (write && rows.length > 0) {
    const { error: insError } = await supabase.from('trailers').insert(rows);
    if (insError) {
      console.error('❌ Eintragen fehlgeschlagen:', insError.message);
      process.exit(1);
    }
    console.log(`\n✅ ${rows.length} Einträge angelegt (ohne Trailer, unverifiziert)`);
  } else {
    console.log(`\n${rows.length} Einträge würden angelegt.${rows.length ? ' Zum Eintragen mit --write starten.' : ''}`);
  }
}

run();
