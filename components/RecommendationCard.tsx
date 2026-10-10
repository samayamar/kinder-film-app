"use client";

import type { ReactNode } from "react";

interface Props {
  empfehlung: string;
  elternhinweise: string[];
  /** z.B. Alternativen, erscheinen unten in der Karte */
  footer?: ReactNode;
}

export default function RecommendationCard({ empfehlung, elternhinweise, footer }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Empfehlung</h3>
      <p className="text-lg font-semibold text-gray-800 mb-4">{empfehlung}</p>
      <div className="space-y-2">
        {elternhinweise.map((hinweis, idx) => (
          <p key={idx} className="text-sm text-gray-700">• {hinweis}</p>
        ))}
      </div>
      {footer}
    </div>
  );
}
