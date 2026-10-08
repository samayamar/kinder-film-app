import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Sucht YouTube-Trailer für Einträge in trailers ohne youtube_id (TMDB), prüft die Videos per YouTube-oEmbed
// und trägt sie als unverifiziert ein. Standard ist ein Trockenlauf, geschrieben wird nur mit --write.
// Mit --replace-broken werden auch vorhandene IDs geprüft: Ist das Video nicht abrufbar/nicht einbettbar oder
// sein Titel enthält weder "trailer" noch "teaser", wird es nur dann ersetzt, wenn ein neuer Trailer gefunden wird.
// Aufruf: npx tsx --env-file=.env.local scripts/fetch-trailers.ts [--write] [--replace-broken] [--limit=20] [--only=frozen] [--exclude="Name 1,Name 2"]
// Benötigt TMDB_API_KEY (v3-Key oder v4 "API Read Access Token") in .env.local.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const tmdbKey = process.env.TMDB_API_KEY;
const write = process.argv.includes('--write');
const replaceBroken = process.argv.includes('--replace-broken');
const limit = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0);
const exclude = new Set(
  (process.argv.find((a) => a.startsWith('--exclude='))?.slice('--exclude='.length) ?? '')
    .split(',')
    .map((n) => n.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim())
    .filter(Boolean)
);
const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1]?.toLowerCase();

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase-Env-Vars fehlen! .env.local geladen?');
  process.exit(1);
}
if (!tmdbKey) {
  console.error('❌ TMDB_API_KEY fehlt. Kostenlosen Key auf themoviedb.org beantragen und in .env.local eintragen.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: { transport: () => null as any },
});

interface Row {
  id: number;
  youtube_id: string | null;
  film_name: string;
  film_year: number | null;
  type: string;
  name_de: string | null;
  name_en: string | null;
  name_es: string | null;
}

type Status = 'ok' | 'kein_trailer' | 'nicht_gefunden' | 'unsicher';

interface Result {
  id: number;
  film_name: string;
  status: Status;
  youtube_id?: string;
  lang?: string | null;
  yt_title?: string;
  tmdb?: string;
  hint?: string;
  replaces?: string;
}

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function tmdb(pathname: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`https://api.themoviedb.org/3${pathname}`);
  const headers: Record<string, string> = {};
  if (tmdbKey!.startsWith('eyJ')) headers.Authorization = `Bearer ${tmdbKey}`;
  else url.searchParams.set('api_key', tmdbKey!);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers });
    if (res.status === 429) {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    if (res.status === 401) {
      console.error('❌ TMDB lehnt den API-Key ab (401). Key in .env.local prüfen.');
      process.exit(1);
    }
    if (!res.ok) throw new Error(`TMDB ${res.status} für ${pathname}`);
    return res.json();
  }
  throw new Error(`TMDB Rate-Limit für ${pathname}`);
}

/** Prüft per oEmbed, ob das Video existiert und eingebettet werden darf. */
async function checkEmbeddable(key: string): Promise<{ ok: boolean; title?: string }> {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${key}`)}&format=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, title: data.title };
  } catch {
    return { ok: false };
  }
}

function yearOf(r: any, kind: 'movie' | 'tv'): number | null {
  const d: string | undefined = kind === 'movie' ? r.release_date : r.first_air_date;
  return d ? Number(d.slice(0, 4)) : null;
}

async function findTmdb(row: Row, kind: 'movie' | 'tv') {
  const names = [...new Set([row.name_en, row.film_name, row.name_de, row.name_es].filter((n): n is string => !!n))];
  const wanted = new Set(names.map(norm));
  const seen = new Map<number, any>();

  for (const name of names) {
    const data = await tmdb(`/search/${kind}`, { query: name, language: 'de-DE' });
    for (const r of data.results ?? []) seen.set(r.id, r);
    // erst ±1 Jahr, dann ±2 (z.B. Produktionsjahr und Kinostart weichen oft ab), jeweils bei exakt passendem Titel
    for (const tolerance of [1, 2]) {
      const exact = [...seen.values()].filter((r) => {
        const y = yearOf(r, kind);
        const titleOk = [r.title, r.name, r.original_title, r.original_name].some((t) => t && wanted.has(norm(t)));
        return titleOk && (row.film_year === null || (y !== null && Math.abs(y - row.film_year) <= tolerance));
      });
      if (exact.length > 0) {
        exact.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
        return { match: exact[0], candidates: exact };
      }
    }
  }
  const candidates = [...seen.values()]
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, 3);
  return { match: null, candidates };
}

async function pickTrailer(tmdbId: number, kind: 'movie' | 'tv') {
  const data = await tmdb(`/${kind}/${tmdbId}/videos`, { language: 'de-DE', include_video_language: 'de,en,null' });
  const rank = (lang: string | null) => (lang === 'de' ? 0 : lang === 'en' ? 1 : lang === null ? 2 : 9);
  const videos = (data.results ?? [])
    .filter((v: any) => v.site === 'YouTube' && v.type === 'Trailer' && rank(v.iso_639_1) < 9)
    .sort(
      (a: any, b: any) =>
        rank(a.iso_639_1) - rank(b.iso_639_1) ||
        Number(b.official) - Number(a.official) ||
        String(a.published_at).localeCompare(String(b.published_at))
    );
  for (const v of videos.slice(0, 3)) {
    const check = await checkEmbeddable(v.key);
    await sleep(100);
    if (check.ok) return { key: v.key as string, lang: v.iso_639_1 as string | null, ytTitle: check.title };
  }
  return null;
}

async function process_(row: Row): Promise<Result> {
  const kind = row.type === 'series' ? 'tv' : 'movie';
  const { match, candidates } = await findTmdb(row, kind);
  if (!match) {
    const hint = candidates.map((c) => `${c.title ?? c.name} (${yearOf(c, kind) ?? '?'})`).join(' | ');
    return { id: row.id, film_name: row.film_name, status: candidates.length ? 'unsicher' : 'nicht_gefunden', hint };
  }
  const tmdbLabel = `${match.title ?? match.name} (${yearOf(match, kind) ?? '?'})`;
  const trailer = await pickTrailer(match.id, kind);
  if (!trailer) return { id: row.id, film_name: row.film_name, status: 'kein_trailer', tmdb: tmdbLabel };
  return {
    id: row.id,
    film_name: row.film_name,
    status: 'ok',
    youtube_id: trailer.key,
    lang: trailer.lang,
    yt_title: trailer.ytTitle,
    tmdb: tmdbLabel,
  };
}

async function run() {
  let query = supabase
    .from('trailers')
    .select('id, youtube_id, film_name, film_year, type, name_de, name_en, name_es')
    .order('id');
  if (!replaceBroken) query = query.is('youtube_id', null);
  const { data, error } = await query;
  if (error) {
    console.error('❌ Lesen fehlgeschlagen:', error.message);
    process.exit(1);
  }

  let rows = (data ?? []) as Row[];
  if (only) rows = rows.filter((r) => norm(r.film_name).includes(norm(only)));
  if (exclude.size > 0) rows = rows.filter((r) => !exclude.has(norm(r.film_name)));

  if (replaceBroken) {
    const existing = rows.filter((r) => r.youtube_id);
    const open = rows.filter((r) => !r.youtube_id);
    const suspect: Row[] = [];
    let healthy = 0;
    for (const r of existing) {
      const check = await checkEmbeddable(r.youtube_id!);
      await sleep(80);
      if (check.ok && /trailer|teaser/i.test(check.title ?? '')) healthy++;
      else suspect.push(r);
    }
    console.log(`🩺 Vorhandene IDs: ${healthy} in Ordnung, ${suspect.length} defekt oder verdächtig (werden ersetzt, falls ein neuer Trailer gefunden wird)`);
    rows = [...open, ...suspect];
  }
  if (limit > 0) rows = rows.slice(0, limit);
  console.log(`🔎 ${rows.length} Einträge zu bearbeiten${write ? ' (Schreibmodus)' : ' (Trockenlauf, nichts wird geschrieben)'}\n`);

  const results: Result[] = [];
  for (const row of rows) {
    let result: Result;
    try {
      result = await process_(row);
    } catch (err) {
      result = { id: row.id, film_name: row.film_name, status: 'nicht_gefunden', hint: String(err) };
    }
    if (row.youtube_id) result.replaces = row.youtube_id;
    results.push(result);
    const icon = { ok: '✅', kein_trailer: '⚪', nicht_gefunden: '❌', unsicher: '❓' }[result.status];
    const detail =
      result.status === 'ok'
        ? `${result.youtube_id} [${result.lang ?? '?'}] ${result.yt_title ?? ''}  ← TMDB: ${result.tmdb}${result.replaces ? `  (ersetzt ${result.replaces})` : ''}`
        : result.status === 'kein_trailer'
          ? `TMDB-Treffer ${result.tmdb}, aber kein einbettbarer Trailer`
          : result.hint ?? '';
    console.log(`${icon} ${row.film_name} (${row.film_year ?? '?'}) → ${detail}`);

    if (write && result.status === 'ok') {
      const base = supabase
        .from('trailers')
        .update({ youtube_id: result.youtube_id, verified: false, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      // nur überschreiben, was wir vorher gesehen haben (kein Überschreiben zwischenzeitlicher Änderungen)
      const { error: upError } = await (row.youtube_id ? base.eq('youtube_id', row.youtube_id) : base.is('youtube_id', null));
      if (upError) console.error(`   ❌ Schreiben fehlgeschlagen: ${upError.message}`);
    }
    await sleep(150);
  }

  const count = (s: Status) => results.filter((r) => r.status === s).length;
  console.log(
    `\nErgebnis: ${count('ok')} gefunden, ${count('kein_trailer')} ohne Trailer, ${count('unsicher')} unsicher, ${count('nicht_gefunden')} nicht gefunden`
  );
  const reportPath = path.join(os.tmpdir(), 'trailer-fetch-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 1));
  console.log(`📄 Vollständiger Bericht: ${reportPath}`);
  if (!write && count('ok') > 0) console.log('Zum Eintragen erneut mit --write starten.');
}

run();
