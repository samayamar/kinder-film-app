import { supabase } from '@/lib/supabase';

import { FilmRow, FilmSuggestion, IndexedFilm, normalizeSearch, resolveFilm, toIndexed } from '@/lib/filmMatch';

export type { FilmSuggestion };

export const MIN_QUERY_LENGTH = 3;
const CACHE_MS = 5 * 60 * 1000;
const MAX_RESULTS = 8;

let cache: { at: number; films: IndexedFilm[] } | null = null;

async function loadFilms(): Promise<IndexedFilm[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.films;

  const { data, error } = await supabase
    .from('trailers')
    .select('film_name, film_year, name_de, name_en, name_es')
    .limit(5000);
  if (error) {
    if (cache) return cache.films;
    throw error;
  }

  const seen = new Set<string>();
  const films: IndexedFilm[] = [];
  for (const row of (data ?? []) as FilmRow[]) {
    const key = `${normalizeSearch(row.film_name)}|${row.film_year ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    films.push(toIndexed(row));
  }
  cache = { at: Date.now(), films };
  return films;
}

/** 0 = Titel beginnt mit Suchtext, 1 = ein Wort beginnt damit, 2 = steckt irgendwo im Titel */
function rank(haystack: string[], q: string): number | null {
  let best: number | null = null;
  for (const h of haystack) {
    const i = h.indexOf(q);
    if (i === -1) continue;
    const score = i === 0 ? 0 : h[i - 1] === ' ' ? 1 : 2;
    if (best === null || score < best) best = score;
  }
  return best;
}

export async function searchFilms(query: string): Promise<FilmSuggestion[]> {
  const q = normalizeSearch(query.slice(0, 60));
  if (q.length < MIN_QUERY_LENGTH) return [];

  const films = await loadFilms();
  return films
    .map((f) => ({ f, score: rank(f.haystack, q) }))
    .filter((x): x is { f: IndexedFilm; score: number } => x.score !== null)
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.f.suggestion.name.length - b.f.suggestion.name.length ||
        a.f.suggestion.name.localeCompare(b.f.suggestion.name, 'de')
    )
    .slice(0, MAX_RESULTS)
    .map((x) => x.f.suggestion);
}

/** Kanonischer Name und Jahr eines Films laut Filmliste, damit Cache und Analyse für alle Schreibweisen übereinstimmen. */
export async function resolveFilmByName(name: string, year: number | null) {
  return resolveFilm(await loadFilms(), name, year);
}
