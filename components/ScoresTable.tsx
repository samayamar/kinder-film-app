interface Scores {
  visuelle_reize: number;
  ton_musik: number;
  emotionale_themen: number;
  spannung_dramaturgie: number;
  komplexitaet: number;
}

interface Props {
  scores: Scores;
  gesamtscore: number;
}

function getRiskColor(score: number): string {
  if (score <= 4) return 'text-green-600 bg-green-50';
  if (score <= 7) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
}

function getRiskBar(score: number): string {
  if (score <= 4) return 'bg-green-500';
  if (score <= 7) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getRiskLabel(score: number): string {
  if (score <= 4) return 'Gering';
  if (score <= 7) return 'Mittel';
  return 'Hoch';
}

export function getGesamtColor(pct: number): string {
  if (pct <= 40) return 'text-red-600';
  if (pct <= 80) return 'text-yellow-600';
  return 'text-green-600';
}

export function getGesamtLabel(pct: number): string {
  if (pct <= 40) return '🔴 Nicht geeignet';
  if (pct <= 80) return '🟡 Mit Begleitung';
  return '🟢 Geeignet';
}

function getGesamtBarColor(pct: number): string {
  if (pct <= 40) return 'bg-red-500';
  if (pct <= 80) return 'bg-yellow-500';
  return 'bg-green-500';
}

const KATEGORIEN = [
  { key: 'visuelle_reize',       label: '🎬 Visuelle Reize'      },
  { key: 'ton_musik',            label: '🎵 Ton & Musik'          },
  { key: 'emotionale_themen',    label: '💔 Emotionale Themen'    },
  { key: 'spannung_dramaturgie', label: '⚡ Spannung'             },
  { key: 'komplexitaet',         label: '🧠 Komplexität'          },
] as const;

export default function ScoresTable({ scores, gesamtscore }: Props) {
  const pct = Math.round(gesamtscore * 10);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      
      {/* Titel */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800">Risikobewertung</h2>
      </div>

      {/* Kategorie-Scores */}
      <div className="divide-y divide-gray-50">
        {KATEGORIEN.map(({ key, label }) => {
          const score = scores[key];
          return (
            <div key={key} className="px-6 py-3 flex items-center gap-4">
              {/* Label */}
              <span className="text-sm text-gray-600 w-44 shrink-0">{label}</span>

              {/* Balken */}
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getRiskBar(score)}`}
                  style={{ width: `${score * 10}%` }}
                />
              </div>

              {/* Score + Label */}
              <div className={`text-sm font-semibold px-2 py-0.5 rounded-md w-20 text-center ${getRiskColor(score)}`}>
                {score}/10 · {getRiskLabel(score)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Gesamtscore */}
      <div className="px-6 py-5 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Gesamteignung</span>
          <span className={`text-2xl font-bold ${getGesamtColor(pct)}`}>
            {pct}%
          </span>
        </div>

        {/* Gesamt-Balken */}
        <div className="bg-gray-200 rounded-full h-3 mb-2">
          <div
            className={`h-3 rounded-full transition-all ${getGesamtBarColor(pct)}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Ampel-Label */}
        <div className={`text-sm font-semibold ${getGesamtColor(pct)}`}>
          {getGesamtLabel(pct)}
        </div>
      </div>

    </div>
  );
}
