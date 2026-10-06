import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { filmName, filmYear } = body;

  if (!filmName) {
    return NextResponse.json({ error: 'Filmname erforderlich' }, { status: 400 });
  }

  const normalized = filmName.toLowerCase().trim();

  try {
    // 1. Suche mit Jahr (wenn vorhanden)
    if (filmYear) {
      const { data } = await supabase
        .from('trailers')
        .select('*')
        .eq('film_name_normalized', normalized)
        .eq('film_year', filmYear)
        .maybeSingle();

      if (data) {
        return NextResponse.json({
          filmName: data.film_name,
          youtubeVideoId: data.youtube_id ?? null,
          found: !!data.youtube_id,
          verified: data.verified,
          source: 'supabase',
          searchUrl: `https://www.youtube.com/@KinoCheck/search?query=${encodeURIComponent(filmName)}`,
        });
      }
    }

    // 2. Suche ohne Jahr
    const { data: dataNoYear } = await supabase
      .from('trailers')
      .select('*')
      .eq('film_name_normalized', normalized)
      .eq('type', 'movie')
      .maybeSingle();

    if (dataNoYear) {
      return NextResponse.json({
        filmName: dataNoYear.film_name,
        youtubeVideoId: dataNoYear.youtube_id ?? null,
        found: !!dataNoYear.youtube_id,
        verified: dataNoYear.verified,
        source: 'supabase',
        searchUrl: `https://www.youtube.com/@KinoCheck/search?query=${encodeURIComponent(filmName)}`,
      });
    }

    // 3. Suche in Serien
    const { data: seriesData } = await supabase
      .from('trailers')
      .select('*')
      .eq('film_name_normalized', normalized)
      .eq('type', 'series')
      .maybeSingle();

    if (seriesData) {
      return NextResponse.json({
        filmName: seriesData.film_name,
        youtubeVideoId: seriesData.youtube_id ?? null,
        found: !!seriesData.youtube_id,
        verified: seriesData.verified,
        source: 'supabase',
        searchUrl: `https://www.youtube.com/@KinoCheck/search?query=${encodeURIComponent(filmName)}`,
      });
    }

    // 4. Nicht gefunden → KinoCheck-Link
    return NextResponse.json({
      filmName,
      youtubeVideoId: null,
      found: false,
      verified: false,
      source: 'not_found',
      searchUrl: `https://www.youtube.com/@KinoCheck/search?query=${encodeURIComponent(filmName)}`,
    });

  } catch (err) {
    console.error('Trailer-Route Fehler:', err);
    return NextResponse.json({
      filmName,
      youtubeVideoId: null,
      found: false,
      verified: false,
      source: 'error',
      searchUrl: `https://www.youtube.com/@KinoCheck/search?query=${encodeURIComponent(filmName)}`,
    });
  }
}
