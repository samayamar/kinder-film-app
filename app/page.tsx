"use client";

import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import { useAnalysisStorage } from "@/lib/useAnalysisStorage";
import AnalysisForm from "@/components/AnalysisForm";
import ScoresTable from "@/components/ScoresTable";
import RecommendationCard from "@/components/RecommendationCard";
import CriticalScenesCard from "@/components/CriticalScenesCard";

interface CriticalScene {
  minute: string;
  was_passiert: string;
  warum_kritisch: string;
  ueberspringen: "ja" | "nein" | "optional";
}

interface AnalysisResult {
  filmName: string;
  alter: number;
  scores: any;
  gesamtscore: number;
  ampel: string;
  begruendung: string;
  empfehlung: string;
  elternhinweise: string[];
  kritische_szenen?: CriticalScene[];
}

interface TrailerData {
  youtubeVideoId: string | null;
  found: boolean;
  searchUrl: string | null;
}

interface StreamingData {
  werstraamtUrl: string;
  kinoDeUrl: string;
  providers: any[];
}

export default function Home() {
  const { saveAnalysis } = useAnalysisStorage();
  const resultRef = useRef<HTMLDivElement>(null);
  const [age, setAge] = useState(7);
  const [filmName, setFilmName] = useState("");
  const [properties, setProperties] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [trailerData, setTrailerData] = useState<TrailerData | null>(null);
  const [streamingData, setStreamingData] = useState<StreamingData | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Scroll nach oben wenn Ergebnis fertig ist
  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filmName.trim()) {
      setError("Filmname eingeben");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setTrailerData(null);
    setStreamingData(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          age, 
          filmName: filmName.trim(), 
          eigenschaften: properties
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewAnalysis = () => {
    setResult(null);
    setTrailerData(null);
    setStreamingData(null);
    setError("");
    setAge(7);
    setFilmName("");
    setProperties([]);
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
      console.error("Extras Fehler:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Header showNewAnalysisLink={result !== null} onNewAnalysis={handleNewAnalysis} />

      <div className="max-w-3xl mx-auto p-4 md:p-8">
        {/* ANALYSIEREN FORM - NUR WENN KEIN ERGEBNIS */}
        {!result && (
          <>
            <AnalysisForm 
              age={age} 
              setAge={setAge} 
              filmName={filmName} 
              setFilmName={setFilmName} 
              properties={properties} 
              setProperties={setProperties} 
              loading={loading} 
              onSubmit={handleAnalyze} 
            />

            {error && <div className="bg-red-100 text-red-800 p-4 rounded mb-8">{error}</div>}

            {/* LOADING BAR */}
            {loading && (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <div className="mb-4">
                  <div className="inline-block text-5xl">
                    <span className="inline-block" style={{ animation: "clap 0.6s infinite" }}>🎬</span>
                  </div>
                </div>
                <p className="text-gray-700 font-semibold mb-4">Analysiere "{filmName}"...</p>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-indigo-600 h-full animate-pulse rounded-full"></div>
                </div>
                <style>{`
                  @keyframes clap {
                    0%, 100% { transform: scaleX(1); }
                    50% { transform: scaleX(-1); }
                  }
                `}</style>
              </div>
            )}
          </>
        )}

        {/* ERGEBNIS - WENN FERTIG */}
        {result && (
          <div ref={resultRef} className="space-y-6">
            {/* HAUPTERGEBNIS */}
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
              <button 
                onClick={() => { saveAnalysis(result); setSaved(true); setTimeout(() => setSaved(false), 2000); }} 
                className="w-full py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
              >
                {saved ? "✓ Zu Favoriten hinzugefügt" : "⭐ Zu Favoriten hinzufügen"}
              </button>
            </div>

            {/* SCORES TABLE */}
            <ScoresTable scores={result.scores} />

            {/* EMPFEHLUNG */}
            <RecommendationCard empfehlung={result.empfehlung} elternhinweise={result.elternhinweise} />

            {/* KRITISCHE SZENEN */}
            {result.kritische_szenen && result.kritische_szenen.length > 0 && (
              <CriticalScenesCard szenen={result.kritische_szenen} />
            )}

            {/* TRAILER */}
            {trailerData && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">🎬 Trailer</h3>
                {trailerData.youtubeVideoId ? (
                  <iframe 
                    width="100%" 
                    height="300" 
                    src={`https://www.youtube-nocookie.com/embed/${trailerData.youtubeVideoId}`} 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen 
                  />
                ) : trailerData.searchUrl ? (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-gray-700 mb-3">Trailer nicht in unserer Datenbank vorhanden.</p>
                    <a href={trailerData.searchUrl} target="_blank" rel="noopener noreferrer" className="inline-block px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700">
                      🔍 Trailer auf KinoCheck suchen
                    </a>
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-4">Kein Trailer verfügbar</p>
                )}
              </div>
            )}

            {/* STREAMING */}
            {streamingData && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">📺 Wo kann man den Film schauen?</h3>
                <div className="space-y-3">
                  <a href={streamingData.werstraamtUrl} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-3 bg-indigo-600 text-white rounded font-semibold hover:bg-indigo-700 transition">
                    ▶️ Verfügbarkeit auf werstreamt.es
                  </a>
                  <a href={streamingData.kinoDeUrl} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-3 bg-amber-600 text-white rounded font-semibold hover:bg-amber-700 transition">
                    🎭 Kinos & Streaming auf kino.de
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
