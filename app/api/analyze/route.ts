import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Du bist ein erfahrener Kindermedien-Analytiker mit Expertise in Entwicklungspsychologie.

ANTWORTE NUR MIT VALID JSON.

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
  "ampeLabel": "string",
  "begruendung": "string",
  "empfehlung": "string",
  "elternhinweise": ["string"],
  "kritischeSzenen": [{"szene": "string", "warnung": "string", "ueberspring": "Ja" | "Nein" | "Optional", "elternscript": "string"}]
}

ALTERSPROFILE:

1-3 Jahre: Können Fiktion kaum verarbeiten. Extreme Sensibilität für: laute Geräusche, schnelle Schnitte, Dunkelheit, Trennungsszenen. Score: Fast immer 🔴

4-6 Jahre: Magisches Denken. EXTREME Sensibilität für: Elternfiguren in Gefahr (+9), Jump-Scares (+8-10), Verwandlungen (+7-9), Tiere in Gefahr (+8-10), bedrohliche Musik (+8). 🔴 bei mehreren Punkten.

7-9 Jahre: Verstehen Fiktion, aber emotional vulnerabel. EXTREME Sensibilität für: Mobbing/Ausgrenzung (+8-10), Elterntod (+7-9), Ungerechtigkeit ungelöst (+7-9), moralische Ambiguität (+6-8), lange Spannungsszenen (+6-8). 🟡 bei mehreren Punkten.

10-12 Jahre: Abstraktes Denken entwickelt sich. Sensibilität für: realistische Gewalt gegen Kinder (+7-9), Gewalt gegen Tiere realistisch (+7-9), Bullying (+6-8), sexuelle Andeutungen (+4-6). 🟡 bei mehreren Punkten.

13-17 Jahre: Können abstrahieren und moralische Graubereiche verstehen. Sensibilität für: realistische Gewalt (+4-7), psychologische Belastung (+4-6), sexuelle Inhalte (+3-6). 🟢 bei den meisten Inhalten, 🟡 nur bei sehr intensiven Szenen.

AMPEL: 🟢 (8-10), 🟡 (6-7), 🔴 (1-5)

WICHTIG: Analysiere den Film basierend auf Plot/Review-Infos, wenn gegeben. Niemals "Ist Kinderfilm = geeignet".`;

export async function POST(request: Request) {
  try {
    const { age, filmName, filmPlot } = await request.json();

    if (!age || !filmName) {
      return Response.json({ error: "Alter und Filmname erforderlich" }, { status: 400 });
    }

    if (age < 1 || age > 17 || !Number.isInteger(age)) {
      return Response.json({ error: "Alter muss zwischen 1 und 17 Jahren liegen" }, { status: 400 });
    }

    const userMessage = filmPlot ? `${age} ${filmName}\n\nPlot/Review-Infos:\n${filmPlot}` : `${age} ${filmName}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const textContent = message.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return Response.json({ error: "Keine Textantwort" }, { status: 500 });
    }

    let jsonText = textContent.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const analysis = JSON.parse(jsonText);

    return Response.json(analysis);
  } catch (error) {
    console.error("API Error:", error);
    return Response.json({ error: error instanceof Error ? error.message : "Fehler" }, { status: 500 });
  }
}
