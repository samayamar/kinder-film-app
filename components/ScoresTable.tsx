"use client";

interface Score {
  score: number;
  description: string;
}

interface Props {
  scores: {
    visuelleReize: Score;
    tonMusik: Score;
    emotionaleThemen: Score;
    spannung: Score;
    komplexitaet: Score;
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
      <h3 className="text-xl font-bold text-gray-900 mb-4">Bewertung</h3>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-200">
          {[
            { name: "Visuelle Reize", item: scores.visuelleReize },
            { name: "Ton & Musik", item: scores.tonMusik },
            { name: "Emotionale Themen", item: scores.emotionaleThemen },
            { name: "Spannung", item: scores.spannung },
            { name: "Komplexitaet", item: scores.komplexitaet },
          ].map((row) => (
            <tr key={row.name}>
              <td className="py-3 px-4 font-medium text-gray-700">{row.name}</td>
              <td className="py-3 px-4 text-right">
                <span className={`${getColor(row.item.score)} text-white px-3 py-1 rounded text-xs font-bold`}>
                  {row.item.score}/10
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
