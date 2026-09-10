import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Du bist ein Kindermedien-Analytiker.

ANTWORTE EXAKT IN DIESEM JSON-FORMAT - KEINE ZUSÄTZE:
{
  "filmName": "string",
  "alter": "number",
  "gesamtscore": "number zwischen 1-10",
  "ampel": "🟢 oder 🟡 oder 🔴",
  "begruendung": "string 2-3 Sätze",
  "empfehlung": "string kurz",
  "elternhinweise": ["string1", "string2", "string3"],
  "scores": {
    "visuelleReize": {"score": "number", "description": "string"},
    "tonMusik": {"score": "number", "description": "string"},
    "emotionaleThemen": {"score": "number", "description": "string"},
    "spannung": {"score": "number", "description": "string"},
    "komplexitaet": {"score": "number", "description": "string"}
  }
}

ANALYSE-RICHTLINIEN:

4-6 JAHRE: Sehr sensibel für Elternfiguren in Gefahr, Jump-Scares, Monster, Tiere in Gefahr
7-9 JAHRE: Empfindlich für Mobbing, Elterntod, Ungerechtigkeit, bedrohliche Musik
10-12 JAHRE: Sensibel für realistische Gewalt gegen Kinder/Tiere, Bullying
13-17 JAHRE: Können mit Gewalt/Graubereichen umgehen, aber intensive Szenen können belasten

SCORING EINFACH:
1-3: Kein Risiko (ideal)
4-6: Niedriges Risiko  
7: Mittleres Risiko (Vorsicht)
8-10: Hohes Risiko

AMPEL:
8-10 = 🟢 (geeignet)
6-7 = 🟡 (mit Begleitung)
1-5 = 🔴 (nicht empfohlen)`;

export async function POST(request: Request) {
  try {
    const { age, filmName } = await request.json();

    if (!age || !filmName) {
      return Response.json({ error: "Alter und Filmname erforderlich" }, { status: 400 });
    }

    if (age < 1 || age > 17 || !Number.isInteger(age)) {
      return Response.json({ error: "Alter muss zwischen 1-17 liegen" }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Analysiere den Film "${filmName}" für ein ${age}-jähriges empfindliches Kind. Antworte nur JSON, keine weiteren Worte.`,
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return Response.json({ error: "Keine Antwort von Claude" }, { status: 500 });
    }

    // Cleane JSON
    let jsonText = textContent.text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Parse und validiere
    const analysis = JSON.parse(jsonText);

    return Response.json(analysis);
  } catch (error) {
    console.error("API Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Fehler" },
      { status: 500 }
    );
  }
}
