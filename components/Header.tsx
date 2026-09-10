"use client";

import Link from "next/link";
import HowItWorks from "@/components/HowItWorks";

interface Props {
  showNewAnalysisLink?: boolean;
  onNewAnalysis?: () => void;
}

export default function Header({ showNewAnalysisLink, onNewAnalysis }: Props) {
  return (
    <header className="sticky top-0 z-50 bg-white shadow">
      <style>{`
        @keyframes clapOpen {
          0% { transform: scaleX(1); }
          50% { transform: scaleX(-1); }
          100% { transform: scaleX(1); }
        }
        .header-icon {
          display: inline-block;
          animation: clapOpen 1.2s ease-in-out infinite;
        }
      `}</style>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-4xl font-bold text-indigo-600">
              <span className="header-icon">🎬</span> Filmabend Kids
            </h1>
            <p className="text-gray-600 mt-2">Sichere Filmanalyse für empfindliche Kinder</p>
          </div>
          <div className="flex gap-3">
            <Link href="/favorites" className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm px-3 py-2 border border-indigo-600 rounded hover:bg-indigo-50 transition">
              ⭐ Favoriten
            </Link>
            {showNewAnalysisLink && (
              <button 
                onClick={onNewAnalysis}
                className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm px-3 py-2 border border-indigo-600 rounded hover:bg-indigo-50 transition"
              >
                ➕ Neue Analyse
              </button>
            )}
          </div>
        </div>
        <HowItWorks />
      </div>
    </header>
  );
}
