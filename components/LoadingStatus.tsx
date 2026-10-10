"use client";

import { useEffect, useState } from "react";

const INTERVAL_MS = 2000;

function messages(filmName: string, age: number): string[] {
  return [
    `Ich prüfe deine Angaben …`,
    `Ich lese den Plot von „${filmName}“ …`,
    `Ich suche nach spannenden und gruseligen Szenen …`,
    `Ich achte auf Musik, Lautstärke und Tempo …`,
    `Ich berücksichtige das Alter von ${age} Jahren …`,
    `Ich vergleiche mit Erkenntnissen zur kindlichen Entwicklung …`,
    `Ich bewerte die emotionalen Themen …`,
    `Ich prüfe, ob Gut und Böse leicht zu unterscheiden sind …`,
    `Ich markiere Szenen, die du vielleicht überspringen möchtest …`,
    `Ich formuliere Tipps für euren Filmabend …`,
    `Gleich geschafft, ich fasse alles zusammen …`,
  ];
}

/** Wechselnde Statusmeldungen während der Analyse (alle 2 Sekunden). Nach der letzten geht es bei der zweiten wieder los. */
export default function LoadingStatus({ filmName, age }: { filmName: string; age: number }) {
  const [index, setIndex] = useState(0);
  const texts = messages(filmName, age);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1 < texts.length ? i + 1 : 1));
    }, INTERVAL_MS);
    return () => clearInterval(timer);
    // texts.length ist konstant
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mb-4 min-h-[3rem] flex items-center justify-center" aria-live="polite">
      <style>{`
        @keyframes status-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .status-fade { animation: status-fade 0.4s ease-out; }
        @media (prefers-reduced-motion: reduce) { .status-fade { animation: none; } }
      `}</style>
      {/* key sorgt dafür, dass die Einblend-Animation bei jedem neuen Text neu startet */}
      <p key={index} className="status-fade text-gray-700 font-semibold">
        {texts[index]}
      </p>
    </div>
  );
}
