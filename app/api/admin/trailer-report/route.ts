import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  // Alle Trailer
  const { data: trailers, error } = await supabase
    .from('trailers')
    .select('*')
    .order('film_name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Search-Log: Anzahl Anfragen pro Film
  const { data: searchLog } = await supabase
    .from('search_log')
    .select('film_name');

  // Anfragen pro Film zählen
  const searchCounts: Record<string, number> = {};
  for (const entry of searchLog ?? []) {
    const key = entry.film_name.toLowerCase().trim();
    searchCounts[key] = (searchCounts[key] ?? 0) + 1;
  }

  // Stats berechnen
  const total      = trailers?.length ?? 0;
  const withId     = trailers?.filter(t => t.youtube_id).length ?? 0;
  const missing    = trailers?.filter(t => !t.youtube_id).length ?? 0;
  const verified   = trailers?.filter(t => t.verified).length ?? 0;
  const unverified = trailers?.filter(t => t.youtube_id && !t.verified).length ?? 0;

  // Trailer mit Search-Count anreichern
  const enriched = (trailers ?? []).map(t => ({
    ...t,
    search_count: searchCounts[t.film_name_normalized] ?? 0,
  }));

  return NextResponse.json({
    stats: { total, withId, missing, verified, unverified },
    trailers: enriched,
  });
}
