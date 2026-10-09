// Reine Funktionen zum Abgleich von Filmnamen mit der Filmliste (ohne Datenbankzugriff, auch in Scripts nutzbar)

export interface FilmSuggestion {
  name: string;
  year: number | null;
  /** Namen in anderen Sprachen, die sich vom Haupttitel unterscheiden (gleiche Namen sind zusammengefasst) */
  alt: { name: string; langs: string[] }[];
}

export interface FilmRow {
  film_name: string;
  film_year: number | null;
  name_de: string | null;
  name_en: string | null;
  name_es: string | null;
}

export interface IndexedFilm {
  suggestion: FilmSuggestion;
  /** normalisierte Namen: Haupttitel zuerst, dann die Namen in anderen Sprachen */
  haystack: string[];
}

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

export function toIndexed(row: FilmRow): IndexedFilm {
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

/**
 * Ordnet eine Eingabe genau einem Eintrag der Filmliste zu (Name in irgendeiner Sprache, exakt).
 * Mit Jahr muss auch das Jahr passen; ohne Jahr muss der Name eindeutig sein.
 * Mehrdeutige oder unbekannte Eingaben liefern null.
 */
export function resolveFilm(films: IndexedFilm[], name: string, year: number | null): { name: string; year: number | null } | null {
  const q = normalizeSearch(name);
  if (!q) return null;
  let matches = films.filter((f) => f.haystack.includes(q));
  if (year !== null) matches = matches.filter((f) => f.suggestion.year === year);
  if (matches.length !== 1) return null;
  return { name: matches[0].suggestion.name, year: matches[0].suggestion.year };
}
