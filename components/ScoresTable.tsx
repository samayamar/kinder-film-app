"use client";

interface Props {
  scores: {
    visuelle_reize: number;
    ton_musik: number;
    emotionale_themen: number;
    spannung_dramaturgie: number;
    komplexitaet: number;
  };
}

export default function ScoresTable({ scores }: Props) {
  const getColor = (score: number) => {
    if (score <= 3) return "bg-green-500";
    if (score <= 6) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Bewertung</h3>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-200">
          {[
            { name: "🎬 Visuelle Reize", score: scores.visuelle_reize },
            { name: "🎵 Ton & Musik", score: scores.ton_musik },
            { name: "💔 Emotionale Themen", score: scores.emotionale_themen },
            { name: "⚡ Spannung & Dramaturgie", score: scores.spannung_dramaturgie },
            { name: "🧠 Komplexität", score: scores.komplexitaet },
          ].map((row) => (
            <tr key={row.name}>
              <td className="py-3 px-4 font-medium text-gray-700">{row.name}</td>
              <td className="py-3 px-4 text-right">
                <span className={`${getColor(row.score)} text-white px-3 py-1 rounded text-xs font-bold`}>
                  {row.score}/10
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
