"use client";

import { useState } from "react";
import { useAnalysisStorage } from "@/lib/useAnalysisStorage";

interface ScoreItem {
  score: number;
  description: string;
}

interface CriticalScene {
  szene: string;
  warnung: string;
  ueberspring: "Ja" | "Nein" | "Optional";
  elternscript: string;
}

interface AnalysisResult {
  filmName: string;
  alter: number;
  eigenschaften: string[];
  scores: {
    visuelleReize: ScoreItem;
    tonMusik: ScoreItem;
    emotionaleThemen: ScoreItem;
    spannung: ScoreItem;
    komplexitaet: ScoreItem;
  };
  gesamtscore: number;
  ampel: "🟢" | "🟡" | "🔴";
  ampeLabel: string;
  begruendung: string;
  empfehlung: string;
  elternhinweise: string[];
  kritischeSzenen: CriticalScene[];
  error?: string;
}

interface TrailerData {
  filmName: string;
  youtubeVideoId: string | null;
  youtubeUrl: string | null;
  trailerTitle: string | null;
  found: boolean;
}

interface StreamingData {
  filmName: string;
  found: boolean;
  searchUrl: string;
  providers: Array<{ name: string; icon: string }>;
}

const CHILD_PROPERTIES_GROUPS = {
  emotional: {
    label: "Emotional & Verhalten",
    items: [
      "Sehr ängstlich",
      "Leicht überfordert",
      "Weint leicht",
      "Kann Spannung gut halten",
      "Hat Albträume nach Filmen",
      "Braucht lange zur Verarbeitung",
    ],
  },
  sensorisch: {
    label: "Sensorisch",
    items: [
      "Empfindlich für laute Geräusche",
      "Empfindlich für schnelle Bilder",
      "Empfindlich für dunkle Szenen",
      "Empfindlich für Jump-Scares",
    ],
  },
  kognitiv: {
    label: "Kognitiv",
    items: [
      "Kann Gut/Böse noch nicht trennen",
      "Hat Angst vor Tieren in Gefahr",
      "Kann abstrakte Konzepte nicht verstehen",
    ],
  },
  sozial: {
    label: "Sozial",
    items: [
      "Mobbing/Ausgrenzung triggert ihn",
      "Fantasy-Szenen verwirren ihn",
    ],
  },
};

export default function Home() {
  const { saveAnalysis } = useAnalysisStorage();

  const [age, setAge] = useState<number>(7);
  const [filmName, setFilmName] = useState("");
  const [properties, setProperties] = useState<string[]>([]);
  const [customProperty, setCustomProperty] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [trailerData, setTrailerData] = useState<TrailerData | null>(null);
  const [streamingData, setStreamingData] = useState<StreamingData | null>(null);
  const [loadingExtras, setLoadingExtras] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handlePropertyToggle = (property: string) => {
    setProperties((prev) =>
      prev.includes(property)
        ? prev.filter((p) => p !== property)
        : [...prev, property]
    );
    setSaved(false);
  };

  const handleAddCustomProperty = () => {
    if (customProperty.trim()) {
      if (!properties.includes(customProperty.trim())) {
        setProperties([...properties, customProperty.trim()]);
      }
      setCustomProperty("");
      setSaved(false);
    }
  };

  const handleRemoveProperty = (prop: string) => {
    setProperties(properties.filter((p) => p !== prop));
    setSaved(false);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!filmName.trim()) {
      setError("Bitte einen Filmnamen eingeben");
      return;
    }

    if (age < 1 || age > 17) {
      setError("Alter muss zwischen 1 und 17 liegen");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setTrailerData(null);
    setStreamingData(null);
    setSaved(false);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: Math.round(age),
          filmName: filmName.trim(),
          eigenschaften: properties,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || "Analysefehler");
        setResult(null);
      } else {
        setResult(data);
        setLoadingExtras(true);
        loadExtras(filmName.trim());
      }
    } catch (err) {
      setError("Fehler bei Analyse");
    } finally {
      setLoading(false);
    }
  };

  const loadExtras = async (film: string) => {
    try {
      const [trailerRes, streamingRes] = await Promise.all([
        fetch("/api/trailer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filmName: film }),
        }),
        fetch("/api/streaming", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filmName: film }),
        }),
      ]);

      const trailer = await trailerRes.json();
      const streaming = await streamingRes.json();

      setTrailerData(trailer);
      setStreamingData(streaming);
    } catch (err) {
      console.error("Fehler:", err);
    } finally {
      setLoadingExtras(false);
    }
  };

  const handleSaveAnalysis = () => {
    if (result) {
      saveAnalysis(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <p className="text-gray-600 text-center">Analysiere einen Film</p>
        </div>

        <form onSubmit={handleAnalyze} className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Alter: <span className="text-indigo-600">{age}</span>
              </label>
              <input type="range" min="1" max="17" value={age} onChange={(e) => setAge(Number(e.target.value))} className="w-full" />
            </div>

            <div>
              <input type="text" value={filmName} onChange={(e) => setFilmName(e.target.value)} placeholder="Filmname" className="w-full px-4 py-2 border rounded" />
            </div>

            <button type="submit" disabled={loading} className="w-full py-2 bg-indigo-600 text-white rounded">
              {loading ? "..." : "Analysieren"}
            </button>
          </div>
        </form>

        {result && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold">{result.filmName}</h2>
              <div className="text-4xl font-bold mb-4">{result.gesamtscore}/10 {result.ampel}</div>
              <button onClick={handleSaveAnalysis} className="w-full py-2 bg-green-600 text-white rounded">
                {saved ? "Gespeichert" : "Speichern"}
              </button>
            </div>

            {trailerData && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold mb-4">Trailer</h3>
                {loadingExtras ? (
                  <p>Ladet...</p>
                ) : trailerData.found && trailerData.youtubeVideoId ? (
                  <iframe width="100%" height="300" src={`https://www.youtube-nocookie.com/embed/${trailerData.youtubeVideoId}`} frameBorder="0" allowFullScreen />
                ) : (
                  <p>Kein Trailer</p>
                )}
              </div>
            )}

            {streamingData && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold mb-4">Wo schauen?</h3>
                <a href={streamingData.searchUrl} target="_blank" className="block w-full text-center py-2 bg-blue-600 text-white rounded">
                  werstreamt.es
                </a>
              </div>
            )}

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-4">Bewertung</h3>
              <table className="w-full text-sm">
                <tbody>
                  {[
                    { name: "Visuell", item: result.scores.visuelleReize },
                    { name: "Ton", item: result.scores.tonMusik },
                    { name: "Emotional", item: result.scores.emotionaleThemen },
                    { name: "Spannung", item: result.scores.spannung },
                    { name: "Komplexitaet", item: result.scores.komplexitaet },
                  ].map((row) => (
                    <tr key={row.name} className="border-t">
                      <td className="py-2">{row.name}</td>
                      <td className="py-2 text-right font-bold">{row.item.score}/10</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
