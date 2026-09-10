"use client";

import { useState } from "react";

export default function HowItWorks() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-gray-200 mt-4 pt-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold text-sm transition"
      >
        {open ? "▼" : "▶"} Wie funktioniert es?
      </button>

      {open && (
        <div className="mt-4 bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-4 text-sm text-gray-700">
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">🤖 Analyse durch Claude AI</h4>
            <p>Die Filmanalyse wird durch Claude AI, ein KI-Sprachmodell von Anthropic, erstellt. Die KI bewertet Filme nach wissenschaftlichen Kriterien und liefert strukturierte, nachvollziehbare Ergebnisse — keine Zensur, sondern objektive Einschätzung.</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-1">📚 Wissenschaftliche Grundlage</h4>
            <p>Unsere Analysen basieren auf etablierten Theorien der Entwicklungspsychologie: Piagets Theorie der kognitiven Entwicklung, Eriksons Stadien der psychosozialen Entwicklung, und aktuellen Forschungen zu Medienkonsum bei Kindern (APA, AACAP). Jedes Alter hat unterschiedliche emotionale und sensorische Grenzen.</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-1">🎬 Filminhalte & Quellen</h4>
            <p>Filminformationen basieren auf: Handlungssynopsen, IMDb & FSK-Beschreibungen, Kritiken & Elternberichte, YouTube-Trailer-Analysen, und wissenschaftlichen Studien zu Medieneffekten. Wir analysieren visuelle Reize, Ton/Musik, emotionale Themen, Spannung und kognitive Komplexität.</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-1">⚠️ Wichtige Hinweise</h4>
            <p>Diese Analyse ersetzt keine eigene Entscheidung. Es gibt keine Gewähr für absolute Eignung. Filme sollten immer zusammen mit Kindern angeschaut werden — Sie kennen Ihr Kind am besten. Im Kino sind Licht, Ton und visuelle Effekte verstärkt und können intensiver wirken als zu Hause.</p>
          </div>
        </div>
      )}
    </div>
  );
}
