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
      <div className="max-w-3xl mx-auto px-4 py-4">
        {/* TITEL OBEN LINKS */}
        <h1 className="text-4xl font-bold text-brand mb-2">🎬 Filmabend Kids</h1>
        <p className="text-gray-600 text-sm mb-4">Filmanalyse für Kinder</p>

        {/* BUTTONS + WIE FUNKTIONIERT ES RECHTS */}
        <div className="flex justify-between items-start">
          <div className="flex gap-3">
            <Link href="/favorites" className="text-brand hover:text-brand-dark font-semibold text-sm px-3 py-2 border border-brand rounded hover:bg-brand-soft transition">
              ⭐ Favoriten
            </Link>
            {showNewAnalysisLink && (
              <button 
                onClick={onNewAnalysis}
                className="text-brand hover:text-brand-dark font-semibold text-sm px-3 py-2 border border-brand rounded hover:bg-brand-soft transition"
              >
                ➕ Neue Analyse
              </button>
            )}
          </div>
          
          {/* WIE FUNKTIONIERT ES RECHTS */}
          <div className="flex-1 flex justify-end">
            <HowItWorks />
          </div>
        </div>
      </div>
    </header>
  );
}
