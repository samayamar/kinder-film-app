export interface CriticalScene {
  minute: string;
  was_passiert: string;
  warum_kritisch: string;
  ueberspringen: "ja" | "nein" | "optional";
}

interface Props {
  szenen: CriticalScene[];
}

export default function CriticalScenesCard({ szenen }: Props) {
  if (!szenen || szenen.length === 0) {
    return null;
  }

  const getSkipLabel = (skip: string) => {
    if (skip === "ja") return { label: "🔴 Überspringen", color: "bg-red-100 border-red-500" };
    if (skip === "nein") return { label: "🟢 Unproblematisch", color: "bg-green-100 border-green-500" };
    return { label: "🟡 Optional", color: "bg-yellow-100 border-yellow-500" };
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4 text-red-600">⚠️ Kritische Szenen</h3>
      <div className="space-y-4">
        {szenen.map((szene, idx) => {
          const skipInfo = getSkipLabel(szene.ueberspringen);
          return (
            <div key={idx} className={`rounded-lg border-l-4 p-4 ${skipInfo.color}`}>
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900">📍 Minute: {szene.minute}</h4>
                <span className="text-sm font-semibold text-gray-700">{skipInfo.label}</span>
              </div>

              <div className="space-y-2 text-sm text-gray-700">
                <div>
                  <span className="font-semibold">Was passiert:</span>
                  <p className="text-gray-700 mt-1">{szene.was_passiert}</p>
                </div>

                <div>
                  <span className="font-semibold">Warum kritisch:</span>
                  <p className="text-gray-700 mt-1">{szene.warum_kritisch}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
