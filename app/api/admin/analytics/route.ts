import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  // Alle Search-Logs
  const { data: logs, error } = await supabase
    .from('search_log')
    .select('film_name, found_in_db, age');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const totalSearches = logs?.length ?? 0;
  const cacheHits     = logs?.filter(l => l.found_in_db).length ?? 0;

  // Top 10 Filme
  const filmCounts: Record<string, number> = {};
  for (const log of logs ?? []) {
    filmCounts[log.film_name] = (filmCounts[log.film_name] ?? 0) + 1;
  }
  const topFilms = Object.entries(filmCounts)
    .map(([film_name, count]) => ({ film_name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Altersgruppen
  const ageCounts: Record<number, number> = {};
  for (const log of logs ?? []) {
    if (log.age) ageCounts[log.age] = (ageCounts[log.age] ?? 0) + 1;
  }
  const ageGroups = Object.entries(ageCounts)
    .map(([age, count]) => ({ age: Number(age), count }))
    .sort((a, b) => a.age - b.age);

  return NextResponse.json({ totalSearches, cacheHits, topFilms, ageGroups });
}
