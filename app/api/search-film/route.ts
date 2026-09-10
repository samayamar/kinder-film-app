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

    // Claude analysiert basierend auf seinem Training-Wissen
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `Gib mir Informationen über den Film "${filmName}":

1. PLOT: Kurze Handlung (2-3 Sätze)
2. PROBLEMATISCHE SZENEN: Elternverlust? Tod? Gewalt? Jump-Scares? Bedrohliche Musik?
3. ALTERSFREIGABE: FSK oder FSK-ähnlich?

Antworte KONKRET, nicht vage.`,
        },
      ],
    });

    let filmInfo = "";
    for (const block of message.content) {
      if (block.type === "text") {
        filmInfo = block.text;
        break;
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
        error: error instanceof Error ? error.message : "Fehler",
      },
      { status: 500 }
    );
  }
}
