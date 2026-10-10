// Gemeinsame Claude-Analyse für die API-Route und Scripts (gleiche Anweisung = gleiche Ergebnisse im Cache)

export const ANALYSIS_MODEL = 'claude-sonnet-4-6';

export const ANALYSIS_SYSTEM_PROMPT = `Du bist ein Kindermedien-Analytiker. Analysiere Filme für empfindliche Kinder.
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
Ampel: "🟢 Sehr gut geeignet" | "🟡 Geeignet mit Begleitung" | "🟠 Mit Vorsicht" | "🔴 Nicht empfohlen"`;

export interface AnalysisInput {
  filmName: string;
  filmYear?: number | null;
  age: number;
  eigenschaften?: string[];
}

export class AnalysisError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

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

/** Ruft Claude auf und liefert die geprüfte Analyse. Wirft AnalysisError (mit HTTP-Status, falls von Anthropic). */
export async function analyzeFilmDetailed({ filmName, filmYear, age, eigenschaften }: AnalysisInput) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AnalysisError('ANTHROPIC_API_KEY ist nicht gesetzt (Vercel: Settings → Environment Variables, danach neu deployen)');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANALYSIS_MODEL,
      max_tokens: 2500,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analysiere "${filmName}"${filmYear ? ` (${filmYear})` : ''} für ein empfindliches Kind von ${age} Jahren.${eigenschaften?.length ? ` Besondere Eigenschaften: ${eigenschaften.join(', ')}.` : ''}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    // Fehlertext von Anthropic (401 = Key fehlt/ungültig, 400 = oft kein Guthaben, 429/529 = Limit/Überlastung)
    const detail = await response.text().catch(() => '');
    throw new AnalysisError(`Claude API Fehler: HTTP ${response.status} – ${detail.slice(0, 500)}`, response.status);
  }

  const data = await response.json();
  if (data.stop_reason === 'max_tokens') {
    console.error('Claude-Antwort wurde bei max_tokens abgeschnitten, JSON vermutlich unvollständig');
  }
  return { result: parseAnalysis(data), usage: (data.usage ?? {}) as { input_tokens?: number; output_tokens?: number } };
}

export async function analyzeFilm(input: AnalysisInput) {
  return (await analyzeFilmDetailed(input)).result;
}
