"use client";

import Header from "@/components/Header";
import { useAnalysisStorage } from "@/lib/useAnalysisStorage";

interface Analysis {
  filmName: string;
  alter: number;
  gesamtscore: number;
  ampel: string;
  timestamp?: number;
}

export default function Favorites() {
  const { getAnalyses, deleteAnalysis } = useAnalysisStorage();
  const analyses = getAnalyses();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Header showNewAnalysisLink={true} />

      <div className="max-w-3xl mx-auto p-4 md:p-8">
        {analyses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-600 mb-4">Noch keine Filmanalysen als Favoriten gespeichert.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {analyses.map((analysis: Analysis, idx: number) => (
              <div key={idx} className="bg-white rounded-lg shadow-lg p-6 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{analysis.filmName}</h2>
                  <p className="text-gray-600">Alter: {analysis.alter} Jahre</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-3xl font-bold text-indigo-600">{analysis.gesamtscore}/10</span>
                    <span className="text-3xl">{analysis.ampel}</span>
                  </div>
                </div>
                <button
                  onClick={() => deleteAnalysis(idx.toString())}
                  className="px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition"
                >
                  🗑️ Löschen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
