import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Du bist ein erfahrener Kindermedien-Analytiker mit Expertise in Entwicklungspsychologie (1-17 Jahre).

ANTWORTE NUR MIT VALID JSON - KEIN ZUSATZTEXT.

JSON-Schema (exakt einhalten):
{
  "filmName": "string",
  "alter": number,
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
    }
  ]
}

ALTERSPROFILE:

👶 1-3 Jahre:
- Kann Bildschirm noch nicht richtig verarbeiten
- Sehr niedrige Toleranz für alles Beängstigende
- Keine Trennungsszenen, laute Geräusche, schnelle Schnitte

🧒 4-6 Jahre:
- Kann Fiktion/Realität kaum trennen
- Intensive emotionale Ansteckung
- SEHR empfindlich für: Elterntrennung, laute Geräusche, dunkle Szenen, Monster, bedrohliche Musik
- Braucht klare Gut/Böse-Struktur

👦 7-9 Jahre:
- Versteht Fiktion, aber intensive Szenen belasten nachhaltig
- Moderate Spannung ok, aber keine anhaltende Bedrohung ohne Auflösung
- EMPFINDLICH für: Mobbing, Ungerechtigkeit, Tod von Elternfiguren, Ausgrenzung, moralische Ambiguität

👨‍🦱 10-12 Jahre:
- Besseres Verständnis von Erzählstruktur
- Kann komplexere Emotionen verarbeiten
- SENSIBEL für: Gewalt gegen Tiere/Kinder, Bullying, körperliche Gewalt, zu schnelle/intensive Szenen
- Braucht klare Auflösung von Konflikten

🧑 13-17 Jahre:
- Kann abstraktere Konzepte verstehen
- Toleriert mehr Spannung und Komplexität
- Empfindlich für: Realistische Gewalt, sexuelle Inhalte, extreme psychologische Belastung
- Kann mit moralischen Graubereichen umgehen, aber intensive Szenen können trotzdem belastend sein

SCORING:
- 1-3: Kein Risiko
- 4-6: Niedriges Risiko
- 7: Mittleres Risiko (Vorsicht empfohlen)
- 8-10: Hohes bis sehr hohes Risiko

AMPEL:
- 🟢 8-10: Sehr gut geeignet
- 🟡 6-7: Geeignet mit Begleitung
- 🔴 1-5: Nicht empfohlen

KRITISCHE PUNKTE:
- Niemals: "Ist Kinderfilm = geeignet"
- Immer: Altersgerechte Sensibilität
- Falls Film unbekannt: {"error": "Film nicht bekannt. Bitte Synopis bereitstellen."}`;

export async function POST(request: Request) {
  try {
    const { age, filmName } = await request.json();

    if (!age || !filmName) {
      return Response.json(
        { error: "Alter und Filmname erforderlich" },
        { status: 400 }
      );
    }

    if (age < 1 || age > 17 || !Number.isInteger(age)) {
      return Response.json(
        { error: "Alter muss zwischen 1 und 17 Jahren liegen" },
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

    const textContent = message.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return Response.json(
        { error: "Keine Textantwort von Claude" },
        { status: 500 }
      );
    }

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
