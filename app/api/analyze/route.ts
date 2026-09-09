import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Du bist ein erfahrener Kindermedien-Analytiker mit Expertise in Entwicklungspsychologie.

Wenn der Nutzer eine Eingabe im Format "[Alter] [Filmname]" sendet, analysierst du den Film systematisch.

ANTWORTE NUR MIT VALID JSON - KEIN ZUSATZTEXT.

JSON-Schema (exakt einhalten):
{
  "filmName": "string",
  "alter": 4 | 7,
  "scores": {
    "visuelleReize": { "score": 1-10, "description": "string" },
    "tonMusik": { "score": 1-10, "description": "string" },
    "emotionaleThemen": { "score": 1-10, "description": "string" },
    "spannung": { "score": 1-10, "description": "string" },
    "komplexitaet": { "score": 1-10, "description": "string" }
  },
  "gesamtscore": 1-10,
  "ampel": "🟢" | "🟡" | "🔴",
  "ampeLabel": "Sehr gut geeignet" | "Geeignet mit Begleitung" | "Nicht empfohlen",
  "begruendung": "2-3 Sätze",
  "empfehlung": "✅ Geeignet" | "⚠️ Mit Vorsicht geeignet" | "❌ Nicht geeignet",
  "elternhinweise": ["Hinweis 1", "Hinweis 2", "Hinweis 3"],
  "kritischeSzenen": [
    {
      "szene": "Szenen-Beschreibung",
      "warnung": "Warum problematisch",
      "ueberspring": "Ja" | "Nein" | "Optional",
      "elternscript": "Was du deinem Kind sagen kannst"
    },
    // maximal 3 Szenen
  ]
}

KRITISCHE PUNKTE:
- 4-Jährige: Können Fiktion/Realität kaum trennen. Empfindlich für Trennung von Eltern, Laute, plötzliche Schnitte, bedrohliche Musik.
- 7-Jährige: Verstehen Fiktion, aber intensive Szenen können nachhaltig belasten. Empfindlich für Ungerechtigkeit, Mobbing, Tod von Elternfiguren.
- NIEMALS: "Ist ein Kinderfilm = ist geeignet." Analysiere unvoreingenommen.
- Wenn du einen Film nicht kennst: {"error": "Film nicht in meiner Datenbank. Bitte eine Filmsynopsis bereitstellen."}`;

export async function POST(request: Request) {
  try {
    const { age, filmName } = await request.json();

    if (!age || !filmName) {
      return Response.json(
        { error: "Alter und Filmname erforderlich" },
        { status: 400 }
      );
    }

    if (![4, 7].includes(age)) {
      return Response.json(
        { error: "Alter muss 4 oder 7 sein" },
        { status: 400 }
      );
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `${age} ${filmName}`,
        },
      ],
    });

    // Extrahiere den Text aus der Response
    const textContent = message.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return Response.json(
        { error: "Keine Textantwort von Claude" },
        { status: 500 }
      );
    }

    // Parse JSON (entferne evtl. Markdown-Blöcke)
    let jsonText = textContent.text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const analysis = JSON.parse(jsonText);

    return Response.json(analysis);
  } catch (error) {
    console.error("API Error:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Analysefehler aufgetreten",
      },
      { status: 500 }
    );
  }
}
