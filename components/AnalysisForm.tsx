"use client";

import FilmNameInput from "@/components/FilmNameInput";

interface Props {
  age: number;
  setAge: (age: number) => void;
  filmName: string;
  setFilmName: (name: string) => void;
  setFilmYear: (year: number | null) => void;
  properties: string[];
  setProperties: (props: string[]) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

// Bewusst kurz gehalten: nur die Angaben, die die Bewertung am stärksten verändern (alles freiwillig)
const PROPERTIES = [
  { label: "Gefühle", items: ["Sehr ängstlich", "Hat Albträume", "Kann Spannungen nicht gut halten"] },
  { label: "Sinne", items: ["Erschrickt bei lauten Geräuschen", "Ängstigt sich bei dunklen Szenen"] },
  { label: "Themen", items: ["Kann Gut/Böse nicht trennen", "Leidet mit, wenn Tiere in Gefahr sind", "Reagiert empfindlich auf Mobbing/Ausgrenzung"] },
];

export default function AnalysisForm({ age, setAge, filmName, setFilmName, setFilmYear, properties, setProperties, loading, onSubmit }: Props) {
  const toggleProperty = (prop: string) => {
    setProperties(properties.includes(prop) ? properties.filter(p => p !== prop) : [...properties, prop]);
  };

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-8">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Alter: <span className="text-brand text-lg font-bold">{age} Jahre</span>
          </label>
          <input type="range" min="1" max="17" value={age} onChange={(e) => setAge(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded accent-brand" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Filmname</label>
          <FilmNameInput value={filmName} onChange={setFilmName} onSelectYear={setFilmYear} />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-700">Besonderheiten deines Kindes</span>
            <span className="text-xs font-medium text-brand-dark bg-brand-soft px-2 py-0.5 rounded-full">optional</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Nur ankreuzen, was auf dein Kind zutrifft. Ohne Angaben bekommst du bei vielen Filmen sofort ein Ergebnis.
          </p>
          {PROPERTIES.map(({ label, items }) => (
            <div key={label} className="mb-4">
              <p className="text-xs font-bold text-gray-600 uppercase mb-2">{label}</p>
              <div className="grid grid-cols-1 gap-2">
                {items.map((prop) => (
                  <label key={prop} className="flex items-center gap-3 p-2 border border-gray-200 rounded cursor-pointer hover:bg-brand-soft">
                    <input type="checkbox" checked={properties.includes(prop)} onChange={() => toggleProperty(prop)} className="w-4 h-4 text-brand rounded cursor-pointer" />
                    <span className="text-sm text-gray-700">{prop}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button type="submit" disabled={loading} className="w-full py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-dark disabled:bg-gray-400">
          {loading ? "Analysiere..." : "Film Analysieren"}
        </button>
      </div>
    </form>
  );
}
