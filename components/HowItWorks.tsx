"use client";

import { useState } from "react";

export default function HowItWorks() {
  const [open, setOpen] = useState(false);

  const sections = [
    {
      title: "🤖 Analyse durch Claude AI",
      content: "Die Filmanalyse wird durch Claude AI, ein KI-Sprachmodell von Anthropic, erstellt. Die KI bewertet Filme nach wissenschaftlichen Kriterien und liefert strukturierte, nachvollziehbare Ergebnisse — keine Zensur, sondern objektive Einschätzung."
    },
    {
      title: "📚 Wissenschaftliche Grundlage",
      content: "Unsere Analysen basieren auf etablierten Theorien der Entwicklungspsychologie: Piagets Theorie der kognitiven Entwicklung, Eriksons Stadien der psychosozialen Entwicklung, und aktuellen Forschungen zu Medienkonsum bei Kindern (APA, AACAP). Jedes Alter hat unterschiedliche emotionale und sensorische Grenzen."
    },
    {
      title: "🎬 Filminhalte & Quellen",
      content: "Filminformationen basieren auf: Handlungssynopsen, IMDb & FSK-Beschreibungen, Kritiken & Elternberichte, YouTube-Trailer-Analysen, und wissenschaftlichen Studien zu Medieneffekten. Wir analysieren visuelle Reize, Ton/Musik, emotionale Themen, Spannung und kognitive Komplexität."
    },
    {
      title: "⚠️ Wichtige Hinweise",
      content: "Diese Analyse ersetzt keine eigene Entscheidung. Es gibt keine Gewähr für absolute Eignung. Filme sollten immer zusammen mit Kindern angeschaut werden — Sie kennen Ihr Kind am besten. Im Kino sind Licht, Ton und visuelle Effekte verstärkt und können intensiver wirken als zu Hause."
    }
  ];

  return (
    <div className="border-t border-gray-200 mt-4 pt-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold text-sm transition"
      >
        {open ? "▼" : "▶"} Wie funktioniert es?
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          {sections.map((section, idx) => (
            <details
              key={idx}
              className="bg-gray-50 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-100 transition"
            >
              <summary className="font-semibold text-gray-900 select-none">
                {section.title}
              </summary>
              <p className="text-gray-700 text-sm mt-2 leading-relaxed">
                {section.content}
              </p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
