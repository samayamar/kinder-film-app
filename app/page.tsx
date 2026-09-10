"use client";

import { useState } from "react";
import { useAnalysisStorage } from "@/lib/useAnalysisStorage";
import AnalysisForm from "@/components/AnalysisForm";
import ScoresTable from "@/components/ScoresTable";
import RecommendationCard from "@/components/RecommendationCard";

interface AnalysisResult {
  filmName: string;
  alter: number;
  scores: any;
  gesamtscore: number;
  ampel: string;
  begruendung: string;
  empfehlung: string;
  elternhinweise: string[];
}

interface TrailerData {
  youtubeVideoId: string | null;
  found: boolean;
}

interface StreamingData {
  werstraamtUrl: string;
  kinoDeUrl: string;
  providers: any[];
}

export default function Home() {
  const { saveAnalysis } = useAnalysisStorage();
  const [age, setAge] = useState(7);
  const [filmName, setFilmName] = useState("");
  const [properties, setProperties] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [trailerData, setTrailerData] = useState<TrailerData | null>(null);
  const [streamingData, setStreamingData] = useState<StreamingData | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filmName.trim()) {
      setError("Filmname eingeben");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      // SCHRITT 1: Search Film Info
      let filmInfo = "";
      try {
        const searchRes = await fetch("/api/search-film", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filmName: filmName.trim() }),
        });
        const searchData = await searchRes.json();
        filmInfo = searchData.filmInfo || "";
      } catch (err) {
        console.warn("Search fehlgeschlagen:", err);
      }

      // SCHRITT 2: Analyze mit Film Info
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          age, 
          filmName: filmName.trim(), 
          eigenschaften: properties,
          filmInfo: filmInfo
        }),
      });

      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
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
        fetch("/api/trailer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filmName: film }) }),
        fetch("/api/streaming", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filmName: film }) }),
      ]);
      const trailer = await trailerRes.json();
      const streaming = await streamingRes.json();
      setTrailerData(trailer);
      setStreamingData(streaming);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <AnalysisForm age={age} setAge={setAge} filmName={filmName} setFilmName={setFilmName} properties={properties} setProperties={setProperties} loading={loading} onSubmit={handleAnalyze} />

        {error && <div className="bg-red-100 text-red-800 p-4 rounded mb-8">{error}</div>}

        {result && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">{result.filmName}</h2>
                  <p className="text-gray-600">für {result.alter}-Jährige</p>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold text-indigo-600">{result.gesamtscore}/10</div>
                  <div className="text-4xl">{result.ampel}</div>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-indigo-500 mb-4">
                <p className="text-gray-700 text-sm">{result.begruendung}</p>
              </div>
              <button onClick={() => { saveAnalysis(result); setSaved(true); }} className="w-full py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700">
                {saved ? "✓ Gespeichert" : "Speichern"}
              </button>
            </div>

            {trailerData && trailerData.found && trailerData.youtubeVideoId && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">🎬 Trailer</h3>
                <iframe width="100%" height="300" src={`https://www.youtube-nocookie.com/embed/${trailerData.youtubeVideoId}`} frameBorder="0" allowFullScreen />
              </div>
            )}

            {streamingData && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">📺 Wo kann man den Film schauen?</h3>
                <div className="space-y-3">
                  <a href={streamingData.werstraamtUrl} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-3 bg-indigo-600 text-white rounded font-semibold hover:bg-indigo-700">
                    Verfügbarkeit auf werstreamt.es
                  </a>
                  <a href={streamingData.kinoDeUrl} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-3 bg-amber-600 text-white rounded font-semibold hover:bg-amber-700">
                    Kinos & Streaming auf kino.de
                  </a>
                </div>
              </div>
            )}

            <ScoresTable scores={result.scores} />
            <RecommendationCard empfehlung={result.empfehlung} elternhinweise={result.elternhinweise} />
          </div>
        )}
      </div>
    </div>
  );
}
