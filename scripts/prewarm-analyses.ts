import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { analyzeFilmDetailed, AnalysisError } from '../lib/analysis';
import { FilmRow, normalizeSearch, resolveFilm, toIndexed } from '../lib/filmMatch';

// Analysiert die bekanntesten Filme der Liste vorab mit Claude und legt die Ergebnisse im Cache (analyses) ab,
// damit Nutzer sie sofort sehen. Auswahl: erst die meistgesuchten Filme, dann nach TMDB-Bekanntheit (Stimmenzahl).
// Bereits gecachte Kombinationen (Film + Alter + Jahr) werden übersprungen. Trockenlauf ist Standard.
// Aufruf: npx tsx --env-file=.env.local scripts/prewarm-analyses.ts [--count=50] [--ages=5,6,7] [--concurrency=4]
//                                                                    [--sample=5] [--max-fsk=6] [--skip="Film A|Film B"] [--write]
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const tmdbKey = process.env.TMDB_API_KEY;
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const write = process.argv.includes('--write');
const count = Number(arg('count') ?? 50);
const ages = (arg('ages') ?? '5,6,7').split(',').map(Number);
const concurrency = Number(arg('concurrency') ?? 4);
const sample = Number(arg('sample') ?? 0);
// Filme mit deutscher Freigabe ab dieser Altersstufe (laut TMDB) werden nicht analysiert (Zielgruppe 5–7 Jahre)
const maxFsk = Number(arg('max-fsk') ?? 6);
// Zusätzliche Ausschlüsse nach Filmname, getrennt mit |
const skip = (arg('skip') ?? '').split('|').map((n) => n.trim()).filter(Boolean);

// Preise laut README (Sonnet 4.6), nur für die Kostenanzeige
const PRICE_IN = 3 / 1_000_000;
const PRICE_OUT = 15 / 1_000_000;

if (!supabaseUrl || !supabaseKey || !tmdbKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY und TMDB_API_KEY werden benötigt (.env.local).');
  process.exit(1);
}
if (write && !process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY fehlt (.env.local).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, { realtime: { transport: () => null as any } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const norm = (s: string) => normalizeSearch(s).replace(/[^a-z0-9]+/g, ' ').trim();

async function tmdb(pathname: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`https://api.themoviedb.org/3${pathname}`);
  const headers: Record<string, string> = {};
  if (tmdbKey!.startsWith('eyJ')) headers.Authorization = `Bearer ${tmdbKey}`;
  else url.searchParams.set('api_key', tmdbKey!);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

interface ListRow extends FilmRow { type: string }

/** Deutsche Altersfreigabe laut TMDB (Kinostart bevorzugt, sonst die höchste bekannte) oder null. */
async function germanFsk(tmdbId: number): Promise<number | null> {
  const data = await tmdb(`/movie/${tmdbId}/release_dates`);
  const de = (data.results ?? []).find((r: any) => r.iso_3166_1 === 'DE');
  const parse = (c: string) => (c === '0' || c === 'o.A.' ? 0 : Number(c));
  const all = (de?.release_dates ?? [])
    .filter((d: any) => d.certification)
    .map((d: any) => ({ type: d.type as number, fsk: parse(d.certification) }))
    .filter((d: { fsk: number }) => !Number.isNaN(d.fsk));
  const theatrical = all.filter((d: { type: number }) => d.type === 3);
  const pool = theatrical.length ? theatrical : all;
  return pool.length ? Math.max(...pool.map((d: { fsk: number }) => d.fsk)) : null;
}

/** TMDB-Stimmenzahl als Maß für die Bekanntheit (Ergebnis wird zwischengespeichert). */
async function voteCounts(rows: ListRow[]): Promise<Map<string, { votes: number; id: number | null }>> {
  const cacheFile = path.join(os.tmpdir(), 'prewarm-votecounts-v2.json');
  const cached: Record<string, { votes: number; id: number | null }> = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf-8')) : {};
  for (const row of rows) {
    const key = `${row.film_name}|${row.film_year}`;
    if (key in cached) continue;
    const names = [...new Set([row.name_en, row.film_name, row.name_de].filter((n): n is string => !!n))];
    let votes = 0;
    let id: number | null = null;
    for (const name of names) {
      const data = await tmdb('/search/movie', { query: name, language: 'de-DE' });
      const hit = (data.results ?? []).find((r: any) => {
        const y = r.release_date ? Number(r.release_date.slice(0, 4)) : null;
        const titleOk = [r.title, r.original_title].some((t: string) => t && names.map(norm).includes(norm(t)));
        return titleOk && (row.film_year === null || (y !== null && Math.abs(y - row.film_year) <= 2));
      });
      if (hit) { votes = hit.vote_count ?? 0; id = hit.id; break; }
    }
    cached[key] = { votes, id };
    await sleep(80);
  }
  fs.writeFileSync(cacheFile, JSON.stringify(cached));
  return new Map(Object.entries(cached));
}

async function run() {
  const { data: trailers, error } = await supabase
    .from('trailers')
    .select('film_name, film_year, name_de, name_en, name_es, type')
    .limit(5000);
  if (error) throw error;
  const rows = (trailers as ListRow[]).filter((r) => r.type === 'movie' && r.film_year !== null);
  const indexed = rows.map(toIndexed);

  // 1) meistgesuchte Filme (Suchprotokoll, auf Listeneinträge abgebildet)
  const { data: log } = await supabase.from('search_log').select('film_name, film_year');
  const usage = new Map<string, number>();
  for (const l of log ?? []) {
    const r = resolveFilm(indexed, l.film_name, l.film_year ?? null);
    if (r) usage.set(`${r.name}|${r.year}`, (usage.get(`${r.name}|${r.year}`) ?? 0) + 1);
  }
  // 2) Bekanntheit laut TMDB
  console.log('📊 Hole TMDB-Bekanntheit der Filmliste …');
  const votes = await voteCounts(rows);

  const ranked: { r: ListRow; key: string; use: number; votes: number; tmdbId: number | null; skip?: boolean; fsk?: number | null }[] = rows
    .map((r) => ({ r, key: `${r.film_name}|${r.film_year}`, use: usage.get(`${r.film_name}|${r.film_year}`) ?? 0, votes: votes.get(`${r.film_name}|${r.film_year}`)?.votes ?? 0, tmdbId: votes.get(`${r.film_name}|${r.film_year}`)?.id ?? null }))
    .sort((a, b) => b.use - a.use || b.votes - a.votes)
    .slice(0, count);

  // Ausschlüsse: manuelle Liste und Freigabe über der Zielgruppe
  const excluded: string[] = [];
  for (const x of ranked) {
    if (skip.some((n) => norm(n) === norm(x.r.film_name))) {
      excluded.push(`${x.r.film_name} (${x.r.film_year}): manuell ausgeschlossen`);
      x.skip = true;
      continue;
    }
    const fsk = x.tmdbId ? await germanFsk(x.tmdbId).catch(() => null) : null;
    x.fsk = fsk;
    if (fsk !== null && fsk > maxFsk) {
      excluded.push(`${x.r.film_name} (${x.r.film_year}): FSK ${fsk}`);
      x.skip = true;
    }
    await sleep(80);
  }

  console.log(`\n🎬 Auswahl (${ranked.length} Filme, davon ${excluded.length} ausgeschlossen):`);
  ranked.forEach((x, i) => console.log(`${String(i + 1).padStart(2)}. ${x.skip ? '⛔' : '  '} ${x.r.film_name} (${x.r.film_year})  Suchen: ${x.use}  TMDB-Stimmen: ${x.votes}  FSK: ${x.fsk ?? '?'}`));
  if (excluded.length) console.log(`\n⛔ Nicht analysiert:\n  ${excluded.join('\n  ')}`);

  // bereits gecachte Kombinationen überspringen
  const { data: cachedRows } = await supabase.from('analyses').select('film_name, film_year, age');
  const have = new Set((cachedRows ?? []).map((c) => `${c.film_name}|${c.film_year ?? ''}|${c.age}`));
  let jobs = ranked.filter((x) => !x.skip).flatMap((x) =>
    ages.map((age) => ({ film: x.r.film_name, year: x.r.film_year as number, age }))
  ).filter((j) => !have.has(`${j.film.toLowerCase().trim()}|${j.year}|${j.age}`));

  if (sample > 0) {
    // wenige, möglichst unterschiedliche Filme und Alter zur Qualitätskontrolle
    const pool = ranked.filter((x) => !x.skip);
    const step = Math.max(1, Math.floor(pool.length / sample));
    const rot = [6, 7, 5];
    jobs = Array.from({ length: sample }, (_, i) => {
      const x = pool[Math.min(i * step, pool.length - 1)];
      return { film: x.r.film_name, year: x.r.film_year as number, age: ages.includes(rot[i % 3]) ? rot[i % 3] : ages[0] };
    }).filter((j) => !have.has(`${j.film.toLowerCase().trim()}|${j.year}|${j.age}`));
  }

  const estIn = jobs.length * 400;
  const estOut = jobs.length * 1100;
  console.log(`\n🧮 ${jobs.length} Analysen offen (${have.size} Cache-Einträge vorhanden). Schätzung: ~${(estIn / 1000).toFixed(0)}k Eingabe- + ~${(estOut / 1000).toFixed(0)}k Ausgabe-Tokens ≈ ${(estIn * PRICE_IN + estOut * PRICE_OUT).toFixed(2)} $`);
  if (!write) {
    console.log('🔎 Trockenlauf: nichts analysiert. Zum Starten mit --write ausführen.');
    return;
  }

  let done = 0;
  let failed = 0;
  let tokIn = 0;
  let tokOut = 0;
  const queue = [...jobs];
  const started = Date.now();

  async function worker() {
    for (let job = queue.shift(); job; job = queue.shift()) {
      const label = `${job.film} (${job.year}, ${job.age}J)`;
      let ok = false;
      for (let attempt = 0; attempt < 4 && !ok; attempt++) {
        try {
          const t0 = Date.now();
          const { result, usage } = await analyzeFilmDetailed({ filmName: job.film, filmYear: job.year, age: job.age });
          const { error: insError } = await supabase.from('analyses').insert({
            film_name: job.film.toLowerCase().trim(),
            film_year: job.year,
            age: job.age,
            result,
          });
          if (insError) throw new Error(`Speichern fehlgeschlagen: ${insError.message}`);
          tokIn += usage.input_tokens ?? 0;
          tokOut += usage.output_tokens ?? 0;
          done++;
          console.log(`✅ [${done + failed}/${jobs.length}] ${label} → ${result.gesamtscore * 10}% ${result.ampel}, ${result.kritische_szenen?.length ?? 0} kritische Szenen, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
          ok = true;
        } catch (err) {
          const retryable = !(err instanceof AnalysisError) || !err.status || err.status === 429 || err.status >= 500;
          if (!retryable || attempt === 3) {
            failed++;
            console.error(`❌ ${label}: ${err instanceof Error ? err.message : err}`);
            break;
          }
          await sleep(5000 * 3 ** attempt);
        }
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  const mins = ((Date.now() - started) / 60000).toFixed(1);
  console.log(`\nFertig in ${mins} Min.: ${done} gespeichert, ${failed} fehlgeschlagen.`);
  console.log(`Tokens: ${tokIn} Eingabe + ${tokOut} Ausgabe ≈ ${(tokIn * PRICE_IN + tokOut * PRICE_OUT).toFixed(2)} $`);
}

run();
