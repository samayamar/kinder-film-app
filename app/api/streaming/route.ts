export async function POST(request: Request) {
  try {
    const { filmName } = await request.json();

    if (!filmName) {
      return Response.json({ error: "Filmname erforderlich" }, { status: 400 });
    }

    return Response.json({
      filmName,
      found: true,
      werstraamtUrl: `https://www.werstreamt.es/filme-serien/?q=${encodeURIComponent(filmName)}&action_results=suchen`,
      kinoDeUrl: `https://www.kino.de/se/?q=${encodeURIComponent(filmName)}`,
      providers: [
        { name: "Netflix", icon: "📺" },
        { name: "Amazon Prime Video", icon: "🎯" },
        { name: "Disney+", icon: "✨" },
        { name: "Sky", icon: "🎬" },
        { name: "RTL+", icon: "📡" },
      ],
    });
  } catch (error) {
    return Response.json({ filmName: "unknown", found: false });
  }
}
