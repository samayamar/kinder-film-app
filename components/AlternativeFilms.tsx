"use client";

import { useEffect, useState } from "react";
import { getGesamtColor, getGesamtLabel } from "@/components/ScoresTable";

interface Alternative {
  name: string;
  score: number;
  ampel: string;
  shareId: string;
}

/** Zwei besser geeignete Filme (mindestens 70 %) aus dem Analyse-Cache für dasselbe Alter. */
export default function AlternativeFilms({ age, filmName }: { age: number; filmName: string }) {
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/alternatives?age=${age}&film=${encodeURIComponent(filmName)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setAlternatives(d.alternatives ?? []); })
      .catch(() => { /* Empfehlungen sind optional */ });
    return () => { cancelled = true; };
  }, [age, filmName]);

  if (alternatives.length === 0) return null;

  return (
    <div className="mt-6 pt-4 border-t border-gray-100">
      <h4 className="font-semibold text-gray-900 mb-3">Besser geeignet für {age}-Jährige</h4>
      <div className="grid gap-2">
        {alternatives.map((a) => (
          <a
            key={a.shareId}
            href={`/share/${a.shareId}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3 hover:bg-brand-soft transition"
          >
            <span className="font-medium text-gray-900">{a.name}</span>
            <span className={`text-sm font-semibold shrink-0 ${getGesamtColor(a.score)}`}>
              {a.score}% · {getGesamtLabel(a.score).replace(/^\S+\s/, "")}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
