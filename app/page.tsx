"use client";

import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import { useAnalysisStorage } from "@/lib/useAnalysisStorage";
import AnalysisForm from "@/components/AnalysisForm";
import ResultView, { AnalysisResult } from "@/components/ResultView";
import ShareButton from "@/components/ShareButton";

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
  const loadingRef = useRef<HTMLDivElement>(null);
  const [age, setAge] = useState(7);
  const [filmName, setFilmName] = useState("");
  const [filmYear, setFilmYear] = useState<number | null>(null);
  const [properties, setProperties] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [trailerData, setTrailerData] = useState<TrailerData | null>(null);
  const [streamingData, setStreamingData] = useState<StreamingData | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Scroll nach ganz oben wenn Ergebnis fertig ist
  useEffect(() => {
    if (result) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [result]);

  // Scroll zu Loading wenn es startet
  useEffect(() => {
    if (loading && loadingRef.current) {
      loadingRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [loading]);

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
          ...(filmYear ? { filmYear } : {}),
          eigenschaften: properties
        }),
      });

      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        loadExtras(filmName.trim(), filmYear);
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
    setFilmYear(null);
    setProperties([]);
  };

  const loadExtras = async (film: string, year: number | null) => {
    try {
      const [trailerRes, streamingRes] = await Promise.all([
        fetch("/api/trailer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filmName: film, ...(year ? { filmYear: year } : {}) }) }),
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
    <div className="min-h-screen bg-surface">
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
              setFilmYear={setFilmYear}
              properties={properties} 
              setProperties={setProperties} 
              loading={loading} 
              onSubmit={handleAnalyze} 
            />

            {error && <div className="bg-bad-soft text-bad-text p-4 rounded mb-8">{error}</div>}

            {/* LOADING BAR */}
            {loading && (
              <div ref={loadingRef} className="bg-white rounded-lg shadow-lg p-8 text-center">
                <div className="mb-6 flex justify-center">
                  <style>{`
                    @keyframes clapboard {
                      0% { transform: rotateY(0deg); }
                      50% { transform: rotateY(90deg); }
                      100% { transform: rotateY(0deg); }
                    }
                    .clapboard {
                      display: inline-block;
                      font-size: 60px;
                      animation: clapboard 0.8s ease-in-out infinite;
                      transform-style: preserve-3d;
                    }
                  `}</style>
                  <div className="clapboard">🎬</div>
                </div>
                <p className="text-gray-700 font-semibold mb-4">Analysiere "{filmName}"...</p>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-brand h-full animate-pulse rounded-full"></div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ERGEBNIS - WENN FERTIG */}
        {result && (
          <div className="space-y-6">
            <ResultView
              result={result}
              actions={
                <>
                  <button
                    onClick={() => { saveAnalysis(result); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
                    className="w-full py-2 bg-brand text-white rounded font-semibold hover:bg-brand-dark"
                  >
                    {saved ? "✓ Zu Favoriten hinzugefügt" : "⭐ Zu Favoriten hinzufügen"}
                  </button>
                  <ShareButton shareId={result.shareId} filmName={result.filmName} />
                </>
              }
            />

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
                  <div className="bg-brand-soft p-4 rounded-lg border border-brand-soft">
                    <p className="text-gray-700 mb-3">Trailer nicht in unserer Datenbank vorhanden.</p>
                    <a href={trailerData.searchUrl} target="_blank" rel="noopener noreferrer" className="inline-block px-4 py-2 bg-brand text-white rounded font-semibold hover:bg-brand-dark">
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
                  <a href={streamingData.werstraamtUrl} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-3 bg-brand text-white rounded font-semibold hover:bg-brand-dark transition">
                    ▶️ Verfügbarkeit auf werstreamt.es
                  </a>
                  <a href={streamingData.kinoDeUrl} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-3 bg-accent text-ink rounded font-semibold hover:bg-accent-dark transition">
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
