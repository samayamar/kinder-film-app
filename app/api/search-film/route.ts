import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: Request) {
  try {
    const { filmName } = await request.json();

    if (!filmName) {
      return Response.json(
        { error: "Filmname erforderlich" },
        { status: 400 }
      );
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      tools: [
        {
          type: "web_search",
        },
      ],
      messages: [
        {
          role: "user",
          content: `Suche nach Informationen über den Film "${filmName}":

1. PLOT: Kurze Handlungszusammenfassung
2. SCENE WARNINGS: Gibt es problematische Szenen? (Elternverlust, Tod, Gewalt, Jump-Scares, Musik?)
3. ALTERSEMPFEHLUNG: Was sagen Eltern-Guides?

Sei KONKRET und SPEZIFISCH.`,
        },
      ],
    });

    let filmInfo = "";
    for (const block of message.content) {
      if (block.type === "text") {
        filmInfo += block.text;
      }
    }

    return Response.json({
      filmName,
      filmInfo: filmInfo || "",
      found: !!filmInfo,
    });
  } catch (error) {
    console.error("Search Error:", error);
    return Response.json(
      {
        filmName: "unknown",
        found: false,
        filmInfo: "",
        error: error instanceof Error ? error.message : "Fehler bei Suche",
      },
      { status: 500 }
    );
  }
}
