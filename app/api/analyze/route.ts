import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { saveResult } from '@/lib/results';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { age, filmName, filmYear, eigenschaften } = body;

  if (!age || !filmName) {
    return NextResponse.json({ error: 'Alter und Filmname erforderlich' }, { status: 400 });
  }

  const filmNameNormalized = filmName.toLowerCase().trim();

  // ── 1. CACHE CHECK (nur ohne Eigenschaften) ─────────────────
  const hasEigenschaften = eigenschaften && eigenschaften.length > 0;
  try {
    if (hasEigenschaften) throw new Error('skip_cache');
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

    const { data: cached } = await cacheQuery.maybeSingle();

    if (cached?.result) {
      console.log(`✅ Cache Hit: ${filmName} (${age}J)`);

      // Trotzdem loggen (found_in_db: true)
      await logSearch({ filmName, filmYear, age, foundInDb: true });

      const shareId = await saveResult({ result: cached.result, filmName, filmYear, age });
      return NextResponse.json({ ...cached.result, shareId });
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
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: `Du bist ein Kindermedien-Analytiker. Analysiere Filme für empfindliche Kinder.
Antworte NUR mit validem JSON, ohne Markdown, ohne Erklärungen.

JSON-Schema:
{
  "filmName": string,
  "alter": number,
  "scores": {
    "visuelle_reize": number,
    "ton_musik": number,
    "emotionale_themen": number,
    "spannung_dramaturgie": number,
    "komplexitaet": number
  },
  "gesamtscore": number,
  "ampel": string,
  "begruendung": string,
  "empfehlung": string,
  "elternhinweise": string[],
  "kritische_szenen": [
    {
      "titel": string,
      "minute": string,
      "was_passiert": string,
      "warum_kritisch": string,
      "ueberspringen": "ja" | "nein" | "optional"
    }
  ]
}

Scores: 1 = kein Risiko, 10 = stark belastend
Gesamtscore: 1 = ungeeignet, 10 = ideal geeignet
Ampel: "🟢 Sehr gut geeignet" | "🟡 Geeignet mit Begleitung" | "🟠 Mit Vorsicht" | "🔴 Nicht empfohlen"`,
        messages: [
          {
            role: 'user',
            content: `Analysiere "${filmName}"${filmYear ? ` (${filmYear})` : ''} für ein empfindliches Kind von ${age} Jahren.${eigenschaften?.length ? ` Besondere Eigenschaften: ${eigenschaften.join(', ')}.` : ''}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API Fehler: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content[0].text;
    result = JSON.parse(text);
  } catch (err) {
    console.error('Claude API Fehler:', err);
    return NextResponse.json({ error: 'Analyse fehlgeschlagen' }, { status: 500 });
  }

  // ── 4. ANALYSE CACHEN (nur ohne Eigenschaften) ───────────────
  try {
    if (hasEigenschaften) throw new Error('skip_cache');
    await supabase.from('analyses').insert({
      film_name: filmNameNormalized,
      film_year: filmYear ?? null,
      age,
      result,
    });
    console.log(`💾 Gecacht: ${filmName} (${age}J)`);
  } catch (saveErr) {
    console.error('Cache-Speichern fehlgeschlagen (unkritisch):', saveErr);
  }

  // ── 5. SEARCH LOG ────────────────────────────────────────────
  await logSearch({ filmName, filmYear, age, foundInDb: false, youtubeId });

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
