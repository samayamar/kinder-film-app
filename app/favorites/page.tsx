"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useAnalysisStorage } from "@/lib/useAnalysisStorage";
import ScoresTable from "@/components/ScoresTable";
import RecommendationCard from "@/components/RecommendationCard";
import CriticalScenesCard from "@/components/CriticalScenesCard";

interface AnalysisData {
  filmName: string;
  alter: number;
  scores: any;
  gesamtscore: number;
  ampel: string;
  begruendung: string;
  empfehlung: string;
  elternhinweise: string[];
  kritische_szenen?: any[];
  timestamp?: number;
}

export default function Favorites() {
  const router = useRouter();
  const { getAnalyses, deleteAnalysis } = useAnalysisStorage();
  const analyses = getAnalyses();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedAnalysis = selectedIndex !== null ? analyses[selectedIndex] : null;

  // Scroll nach oben wenn Favorit ausgewählt wird
  useEffect(() => {
    if (selectedIndex !== null) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [selectedIndex]);

  const handleNewAnalysis = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Header showNewAnalysisLink={selectedAnalysis === null} onNewAnalysis={handleNewAnalysis} />

      <div className="max-w-3xl mx-auto p-4 md:p-8">
        {/* LISTE DER FAVORITEN */}
        {!selectedAnalysis && (
          <>
            {analyses.length === 0 ? (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <p className="text-gray-600 mb-4">Noch keine Filmanalysen als Favoriten gespeichert.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {analyses.map((analysis: AnalysisData, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedIndex(idx)}
                    className="bg-white rounded-lg shadow-lg p-6 flex justify-between items-start cursor-pointer hover:shadow-xl transition"
                  >
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900">{analysis.filmName}</h2>
                      <p className="text-gray-600">Alter: {analysis.alter} Jahre</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-3xl font-bold text-indigo-600">{analysis.gesamtscore}/10</span>
                        <span className="text-3xl">{analysis.ampel}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAnalysis(idx.toString());
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition"
                    >
                      🗑️ Löschen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* DETAIL-ANSICHT */}
        {selectedAnalysis && (
          <div className="space-y-6">
            <button
              onClick={() => setSelectedIndex(null)}
              className="text-indigo-600 hover:text-indigo-800 font-semibold mb-4"
            >
              ← Zurück zu Favoriten
            </button>

            {/* HAUPTERGEBNIS */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">{selectedAnalysis.filmName}</h2>
                  <p className="text-gray-600">für {selectedAnalysis.alter}-Jährige</p>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold text-indigo-600">{selectedAnalysis.gesamtscore}/10</div>
                  <div className="text-4xl">{selectedAnalysis.ampel}</div>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-indigo-500 mb-4">
                <p className="text-gray-700 text-sm">{selectedAnalysis.begruendung}</p>
              </div>
              <button
                onClick={() => {
                  deleteAnalysis(selectedIndex!.toString());
                  setSelectedIndex(null);
                }}
                className="w-full py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700"
              >
                🗑️ Aus Favoriten entfernen
              </button>
            </div>

            {/* SCORES TABLE */}
            <ScoresTable scores={selectedAnalysis.scores} />

            {/* EMPFEHLUNG */}
            <RecommendationCard
              empfehlung={selectedAnalysis.empfehlung}
              elternhinweise={selectedAnalysis.elternhinweise}
            />

            {/* KRITISCHE SZENEN */}
            {selectedAnalysis.kritische_szenen && selectedAnalysis.kritische_szenen.length > 0 && (
              <CriticalScenesCard szenen={selectedAnalysis.kritische_szenen} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
