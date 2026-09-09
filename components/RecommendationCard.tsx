"use client";

interface Props {
  empfehlung: string;
  elternhinweise: string[];
}

export default function RecommendationCard({ empfehlung, elternhinweise }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Empfehlung</h3>
      <p className="text-lg font-semibold text-gray-800 mb-4">{empfehlung}</p>
      <div className="space-y-2">
        {elternhinweise.map((hinweis, idx) => (
          <p key={idx} className="text-sm text-gray-700">• {hinweis}</p>
        ))}
      </div>
    </div>
  );
}
