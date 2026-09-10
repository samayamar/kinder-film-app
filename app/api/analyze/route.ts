import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { age, filmName, eigenschaften } = await request.json();

    if (!filmName || !age) {
      return Response.json(
        { error: "Filmname und Alter erforderlich" },
        { status: 400 }
      );
    }

    const ageValidation = age >= 1 && age <= 17;
    if (!ageValidation) {
      return Response.json(
        { error: "Alter muss zwischen 1 und 17 liegen" },
        { status: 400 }
      );
    }

    const systemPrompt = `
Du bist ein erfahrener Kindermedien-Analytiker. Analysiere den Film AUSSCHLIESSLICH basierend auf faktischen Informationen über Handlung, Szenen und Inhalte. NICHT spekulieren oder annahmen machen.

**WICHTIG: Antworte NUR mit gültigem JSON, keine Markdown-Blöcke, keine Erklärungen.**

Bewerte den Film für ein ${age}-jähriges empfindliches Kind nach 5 Kategorien (1-10 Skala, 1 = kein Risiko, 10 = sehr belastend):

1. **Visuelle Reize**: Dunkelheit, Jump-Scares, beängstigende Figuren, schnelle Schnitte
2. **Ton & Musik**: Laute Geräusche, bedrohliche Musik, Schreie, Spannung ohne Entlastung
3. **Emotionale Themen**: Elterntrennung, Tod, Ausgrenzung, Hilflosigkeit
4. **Spannung & Dramaturgie**: Länge von Bedrohungsszenen, Erholungspausen, Auflösung
5. **Komplexität**: Verständlichkeit, abstrakte Konzepte, moralische Graubereiche

Gib die Antwort in EXAKT diesem JSON-Format zurück (Pflichtfelder):

{
  "filmName": "NAME",
  "alter": ZAHL,
  "scores": {
    "visuelle_reize": ZAHL,
    "ton_musik": ZAHL,
    "emotionale_themen": ZAHL,
    "spannung_dramaturgie": ZAHL,
    "komplexitaet": ZAHL
  },
  "gesamtscore": ZAHL,
  "ampel": "🟢|🟡🟠|🔴",
  "begruendung": "Satz 1-2 zur Gesamtbewertung",
  "empfehlung": "Satz zur Empfehlung",
  "elternhinweise": ["Tipp 1", "Tipp 2"],
  "kritische_szenen": [
    {
      "minute": "ca. 15-20",
      "was_passiert": "Beschreibung",
      "warum_kritisch": "Grund",
      "ueberspringen": "ja|nein|optional"
    }
  ]
}

**Richtlinien:**
- Ampel: 🟢 (8-10), 🟡🟠 (6-7), 🔴 (1-5)
- Für kritische Szenen: Nur NACHWEISBARE Szenen aus dem Film nennen
- "ueberspringen": "ja" nur wenn sehr belastend, "nein" wenn schaubar, "optional" wenn je nach Kind
- Keine Annahmen oder Spekulationen
`;

    const userPrompt = `Analysiere "${filmName}" für ein ${age}-jähriges empfindliches Kind.${
      eigenschaften.length > 0
        ? ` Zusätzliche Eigenschaften: ${eigenschaften.join(", ")}`
        : ""
    }`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    const textContent = response.content.find((block) => block.type === "text");
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

    const data = JSON.parse(jsonText);

    return Response.json(data);
  } catch (error) {
    console.error("Analyze Error:", error);
    return Response.json(
      { error: "Fehler bei der Filmanalyse" },
      { status: 500 }
    );
  }
}
