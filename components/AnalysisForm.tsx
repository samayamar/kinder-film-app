"use client";

interface Props {
  age: number;
  setAge: (age: number) => void;
  filmName: string;
  setFilmName: (name: string) => void;
  properties: string[];
  setProperties: (props: string[]) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

const PROPERTIES = {
  emotional: ["Sehr ängstlich", "Leicht überfordert", "Weint leicht", "Kann Spannung gut halten", "Hat Albträume", "Braucht lange zur Verarbeitung"],
  sensorisch: ["Laute Geräusche", "Schnelle Bilder", "Dunkle Szenen", "Jump-Scares"],
  kognitiv: ["Kann Gut/Böse nicht trennen", "Angst vor Tieren in Gefahr", "Abstrakte Konzepte schwierig"],
  sozial: ["Mobbing/Ausgrenzung", "Fantasy-Szenen verwirren"],
};

export default function AnalysisForm({ age, setAge, filmName, setFilmName, properties, setProperties, loading, onSubmit }: Props) {
  const toggleProperty = (prop: string) => {
    setProperties(properties.includes(prop) ? properties.filter(p => p !== prop) : [...properties, prop]);
  };

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-8">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Alter: <span className="text-indigo-600 text-lg font-bold">{age} Jahre</span>
          </label>
          <input type="range" min="1" max="17" value={age} onChange={(e) => setAge(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded accent-indigo-600" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Filmname</label>
          <input type="text" value={filmName} onChange={(e) => setFilmName(e.target.value)} placeholder="z.B. Frozen, Dumbo..." className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">Kind-Eigenschaften</label>
          {Object.entries(PROPERTIES).map(([group, items]) => (
            <div key={group} className="mb-4">
              <p className="text-xs font-bold text-gray-600 uppercase mb-2">{group === "emotional" ? "Emotional" : group === "sensorisch" ? "Sensorisch" : group === "kognitiv" ? "Kognitiv" : "Sozial"}</p>
              <div className="grid grid-cols-1 gap-2">
                {items.map((prop) => (
                  <label key={prop} className="flex items-center gap-3 p-2 border border-gray-200 rounded cursor-pointer hover:bg-indigo-50">
                    <input type="checkbox" checked={properties.includes(prop)} onChange={() => toggleProperty(prop)} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" />
                    <span className="text-sm text-gray-700">{prop}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-400">
          {loading ? "Analysiere..." : "Film Analysieren"}
        </button>
      </div>
    </form>
  );
}
