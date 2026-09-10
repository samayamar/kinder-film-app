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
    if (skip === "ja") return "🔴 Ja, überspringen empfohlen";
    if (skip === "nein") return "🟢 Nein, schaubar";
    return "🟡 Optional, je nach Kind";
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4 text-red-600">⚠️ Kritische Szenen</h3>
      <div className="space-y-4">
        {szenen.map((szene, idx) => (
          <div key={idx} className="bg-red-50 rounded-lg border-l-4 border-red-500 p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-gray-900">📍 Minute: {szene.minute}</h4>
              <span className="text-sm font-semibold text-red-600">{getSkipLabel(szene.ueberspringen)}</span>
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
        ))}
      </div>
    </div>
  );
}
