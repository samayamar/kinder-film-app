import { readFileSync } from "fs";
import { join } from "path";

function loadTrailerDatabase() {
  try {
    const filePath = join(process.cwd(), "lib/data/trailers.json");
    const data = readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Trailer DB Error:", error);
    return { trailers: [], series: [] };
  }
}

export async function POST(request: Request) {
  try {
    const { filmName } = await request.json();

    if (!filmName) {
      return Response.json({ error: "Filmname erforderlich" }, { status: 400 });
    }

    const db = loadTrailerDatabase();

    // Suche in Filmen
    let found = db.trailers.find(
      (t: any) => t.filmName.toLowerCase() === filmName.toLowerCase()
    );

    // Suche in Serien
    if (!found) {
      found = db.series.find(
        (s: any) => s.seriesName.toLowerCase() === filmName.toLowerCase()
      );
    }

    // Hat ID und es ist nicht "pending"
    if (found && found.youtubeId && found.youtubeId !== "pending") {
      return Response.json({
        filmName,
        youtubeVideoId: found.youtubeId,
        found: true,
        source: "database",
        searchUrl: null,
      });
    }

    // Keine ID oder "pending" → Generate Search Link
    const searchUrl = `https://www.youtube.com/@KinoCheck/search?query=${encodeURIComponent(filmName)}`;

    return Response.json({
      filmName,
      youtubeVideoId: null,
      found: false,
      source: "search",
      searchUrl: searchUrl,
    });
  } catch (error) {
    console.error("Trailer Error:", error);
    return Response.json({ 
      filmName: "unknown", 
      found: false, 
      youtubeVideoId: null,
      searchUrl: null
    });
  }
}
