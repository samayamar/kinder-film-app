"use client";

import { useState } from "react";

export default function HowItWorks() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold text-sm transition whitespace-nowrap"
      >
        {open ? "▼" : "▶"} Wie funktioniert es?
      </button>

      {open && (
        <div className="absolute right-4 mt-2 bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-3 text-sm text-gray-700 w-80 shadow-lg">
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">🤖 Claude AI Analyse</h4>
            <p>Anthropic's Claude AI bewertet Filme nach wissenschaftlichen Kriterien — objektiv, ohne Zensur.</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-1">📚 Wissenschaftlich fundiert</h4>
            <p>Basiert auf Piaget & Erikson zur Kinderentwicklung sowie APA-Forschung zu Medieneffekten.</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-1">🎬 Quellen</h4>
            <p>Handlung, IMDb, FSK, Kritiken, Trailer und Medienforschung analysieren visuelle Reize, Ton, Themen und Komplexität.</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-1">⚠️ Wichtig</h4>
            <p>Keine Gewähr. Filme mit Kind schauen. Im Kino sind Effekte intensiver. Sie kennen Ihr Kind am besten.</p>
          </div>
        </div>
      )}
    </div>
  );
}
