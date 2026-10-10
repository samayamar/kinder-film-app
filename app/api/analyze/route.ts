import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { saveResult } from '@/lib/results';
import { resolveFilmByName } from '@/lib/filmSearch';
import { analyzeFilm } from '@/lib/analysis';

// Eine Analyse dauert 25–60 s; ohne Angabe gilt auf Vercel eine deutlich kürzere Standardgrenze
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { age, filmName: typedName, filmYear: typedYear, eigenschaften } = body;

  if (!age || !typedName) {
    return NextResponse.json({ error: 'Alter und Filmname erforderlich' }, { status: 400 });
  }

  // Filmname und Jahr laut Filmliste vereinheitlichen: "dumbo" und "Dumbo (1941)" sind derselbe Cache-Eintrag.
  // Nicht eindeutige oder unbekannte Eingaben bleiben, wie sie sind.
  let filmName: string = typedName;
  let filmYear: number | null = typedYear ?? null;
  try {
    const resolved = await resolveFilmByName(typedName, filmYear);
    if (resolved) {
      filmName = resolved.name;
      filmYear = resolved.year;
    }
  } catch (err) {
    console.error('Filmliste nicht abrufbar, nutze Eingabe unverändert (unkritisch):', err);
  }
  const filmNameNormalized = filmName.toLowerCase().trim();

  // ── 1. CACHE CHECK (nur ohne Eigenschaften) ─────────────────
  const hasEigenschaften = eigenschaften && eigenschaften.length > 0;
  try {
    if (!hasEigenschaften) {
      let cacheQuery = supabase
        .from('analyses')
        .select('result')
        .eq('film_name', filmNameNormalized)
        .eq('age', age);

      if (filmYear) {
        cacheQuery = cacheQuery.eq('film_year', filmYear);
      } else {
        cacheQuery = cacheQuery.is('film_year', null);
      }

      const { data: cached, error: cacheError } = await cacheQuery.maybeSingle();
      if (cacheError) console.error('Cache-Check fehlgeschlagen (unkritisch):', cacheError.message.slice(0, 200));

      if (cached?.result) {
        console.log(`✅ Cache Hit: ${filmName} (${age}J)`);

        // Trotzdem loggen (found_in_db: true)
        await logSearch({ filmName: typedName, filmYear: typedYear ?? undefined, age, foundInDb: true });

        const shareId = await saveResult({ result: cached.result, filmName, filmYear, age });
        return NextResponse.json({ ...cached.result, shareId });
      }
    }
  } catch (cacheErr) {
    console.error('Cache-Check fehlgeschlagen (unkritisch):', cacheErr);
  }

  // ── 2. TRAILER INFO (für Logging) ───────────────────────────
  let youtubeId: string | null = null;
  try {
    const trailerRes = await fetch(`${req.nextUrl.origin}/api/trailer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filmName, filmYear }),
    });
    if (trailerRes.ok) {
      const trailerData = await trailerRes.json();
      youtubeId = trailerData.youtubeVideoId ?? null;
    }
  } catch {
    // Trailer-Fehler sind nicht kritisch
  }

  // ── 3. CLAUDE API ────────────────────────────────────────────
  let result;
  try {
    result = await analyzeFilm({ filmName, filmYear, age, eigenschaften });
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Analyse fehlgeschlagen' }, { status: 500 });
  }

  // ── 4. ANALYSE CACHEN (nur ohne Eigenschaften) ───────────────
  try {
    if (!hasEigenschaften) {
      const { error: saveError } = await supabase.from('analyses').insert({
        film_name: filmNameNormalized,
        film_year: filmYear ?? null,
        age,
        result,
      });
      if (saveError) console.error('Cache-Speichern fehlgeschlagen (unkritisch):', saveError.message.slice(0, 200));
      else console.log(`💾 Gecacht: ${filmName} (${age}J)`);
    }
  } catch (saveErr) {
    console.error('Cache-Speichern fehlgeschlagen (unkritisch):', saveErr);
  }

  // ── 5. SEARCH LOG ────────────────────────────────────────────
  await logSearch({ filmName: typedName, filmYear: typedYear ?? undefined, age, foundInDb: false, youtubeId });

  // ── 6. ERGEBNIS FÜR SHARE-LINK SPEICHERN (auch mit Eigenschaften) ──
  const shareId = await saveResult({ result, filmName, filmYear, age, eigenschaften });

  return NextResponse.json({ ...result, shareId });
}

// ── HELPER ────────────────────────────────────────────────────

async function logSearch({
  filmName, filmYear, age, foundInDb, youtubeId = null,
}: {
  filmName: string;
  filmYear?: number;
  age: number;
  foundInDb: boolean;
  youtubeId?: string | null;

}) {
  try {
    await supabase.from('search_log').insert({
      film_name: filmName,
      film_year: filmYear ?? null,
      age,
      found_in_db: foundInDb,
      has_youtube_id: !!youtubeId,
      youtube_id: youtubeId,
    });
  } catch (logErr) {
    console.error('Search Log fehlgeschlagen (unkritisch):', logErr);
  }
}
