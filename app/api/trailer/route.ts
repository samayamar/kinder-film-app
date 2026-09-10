import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { filmName } = await request.json();

    if (!filmName) {
      return Response.json({ error: "Filmname erforderlich" }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `YouTube Trailer Video-ID für "${filmName}". Antworte nur mit ID (z.B. dQw4w9WgXcQ) oder "none".`,
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === "text");
    const videoId = textContent && textContent.type === "text" ? textContent.text.trim() : null;

    return Response.json({
      filmName,
      youtubeVideoId: videoId && videoId !== "none" ? videoId : null,
      found: videoId !== "none" && !!videoId,
    });
  } catch (error) {
    return Response.json({ filmName: "unknown", found: false, youtubeVideoId: null });
  }
}
