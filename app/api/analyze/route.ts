import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { saveResult } from '@/lib/results';

// Eine Analyse dauert 25–60 s; ohne Angabe gilt auf Vercel eine deutlich kürzere Standardgrenze
export const maxDuration = 60;

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
        await logSearch({ filmName, filmYear, age, foundInDb: true });

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
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY ist nicht gesetzt (Vercel: Settings → Environment Variables, danach neu deployen)');
    return NextResponse.json({ error: 'Analyse fehlgeschlagen' }, { status: 500 });
  }

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
        max_tokens: 2500,
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
      // Fehlertext von Anthropic ins Log (401 = Key fehlt/ungültig, 400 = oft kein Guthaben, 429/529 = Limit/Überlastung)
      const detail = await response.text().catch(() => '');
      console.error(`Claude API Fehler: HTTP ${response.status} – ${detail.slice(0, 500)}`);
      return NextResponse.json({ error: 'Analyse fehlgeschlagen' }, { status: 500 });
    }

    const data = await response.json();
    if (data.stop_reason === 'max_tokens') {
      console.error('Claude-Antwort wurde bei max_tokens abgeschnitten, JSON vermutlich unvollständig');
    }
    result = parseAnalysis(data);
  } catch (err) {
    console.error('Claude-Antwort nicht auswertbar:', err);
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
  await logSearch({ filmName, filmYear, age, foundInDb: false, youtubeId });

  // ── 6. ERGEBNIS FÜR SHARE-LINK SPEICHERN (auch mit Eigenschaften) ──
  const shareId = await saveResult({ result, filmName, filmYear, age, eigenschaften });

  return NextResponse.json({ ...result, shareId });
}

// ── HELPER ────────────────────────────────────────────────────

/** Liest das JSON aus der Claude-Antwort; toleriert Markdown-Zäune und Text drumherum. */
function parseAnalysis(data: any) {
  const text: string = (data.content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error(`Kein JSON in der Antwort: ${text.slice(0, 200)}`);

  const parsed = JSON.parse(text.slice(start, end + 1));
  if (
    typeof parsed.filmName !== 'string' ||
    typeof parsed.gesamtscore !== 'number' ||
    typeof parsed.scores !== 'object' || parsed.scores === null
  ) {
    throw new Error(`Antwort hat nicht das erwartete Schema: ${Object.keys(parsed).join(', ')}`);
  }
  return parsed;
}
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
