import { supabase } from '@/lib/supabase';

export interface FilmSuggestion {
  name: string;
  year: number | null;
  /** Namen in anderen Sprachen, die sich vom Haupttitel unterscheiden (gleiche Namen sind zusammengefasst) */
  alt: { name: string; langs: string[] }[];
}

interface FilmRow {
  film_name: string;
  film_year: number | null;
  name_de: string | null;
  name_en: string | null;
  name_es: string | null;
}

interface IndexedFilm {
  suggestion: FilmSuggestion;
  haystack: string[];
}

export const MIN_QUERY_LENGTH = 3;
const CACHE_MS = 5 * 60 * 1000;
const MAX_RESULTS = 8;

let cache: { at: number; films: IndexedFilm[] } | null = null;

/** Kleinschreibung, ohne Akzente (Increíbles → increibles), ß → ss */
export function normalizeSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function toIndexed(row: FilmRow): IndexedFilm {
  const main = row.film_name;
  const alt = new Map<string, { name: string; langs: string[] }>();
  for (const [lang, name] of [['DE', row.name_de], ['EN', row.name_en], ['ES', row.name_es]] as const) {
    if (!name || normalizeSearch(name) === normalizeSearch(main)) continue;
    const key = normalizeSearch(name);
    const entry = alt.get(key) ?? { name, langs: [] };
    entry.langs.push(lang);
    alt.set(key, entry);
  }
  const suggestion: FilmSuggestion = { name: main, year: row.film_year, alt: [...alt.values()] };
  return {
    suggestion,
    haystack: [main, ...suggestion.alt.map((a) => a.name)].map(normalizeSearch),
  };
}

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
