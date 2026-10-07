import type { ReactNode } from "react";
import ScoresTable, { getGesamtColor, getGesamtLabel } from "@/components/ScoresTable";
import RecommendationCard from "@/components/RecommendationCard";
import CriticalScenesCard, { CriticalScene } from "@/components/CriticalScenesCard";

export interface AnalysisResult {
  filmName: string;
  alter: number;
  scores: any;
  gesamtscore: number;
  ampel: string;
  begruendung: string;
  empfehlung: string;
  elternhinweise: string[];
  kritische_szenen?: CriticalScene[];
  shareId?: string | null;
}

interface Props {
  result: AnalysisResult;
  /** Buttons unter der Begründung (Favoriten, Teilen, ...) */
  actions?: ReactNode;
}

export default function ResultView({ result, actions }: Props) {
  const pct = Math.round(result.gesamtscore * 10);

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">{result.filmName}</h2>
            <p className="text-gray-600">für {result.alter}-Jährige</p>
          </div>
          <div className="text-right">
            <div className={`text-5xl font-bold ${getGesamtColor(pct)}`}>{pct}%</div>
            <div className={`text-lg font-semibold ${getGesamtColor(pct)}`}>{getGesamtLabel(pct)}</div>
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-brand mb-4">
          <p className="text-gray-700 text-sm">{result.begruendung}</p>
        </div>
        {actions && <div className="space-y-2">{actions}</div>}
      </div>

      <ScoresTable scores={result.scores} gesamtscore={result.gesamtscore} />

      <RecommendationCard empfehlung={result.empfehlung} elternhinweise={result.elternhinweise} />

      {result.kritische_szenen && result.kritische_szenen.length > 0 && (
        <CriticalScenesCard szenen={result.kritische_szenen} />
      )}
    </>
  );
}
