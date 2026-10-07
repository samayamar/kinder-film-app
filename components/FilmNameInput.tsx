"use client";

import { useEffect, useRef, useState } from "react";

interface Suggestion {
  name: string;
  year: number | null;
  alt: { name: string; langs: string[] }[];
}

interface Props {
  value: string;
  onChange: (name: string) => void;
  onSelectYear: (year: number | null) => void;
}

const MIN_LENGTH = 3;
const DEBOUNCE_MS = 200;

export default function FilmNameInput({ value, onChange, onSelectYear }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const requestId = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const search = (text: string) => {
    clearTimeout(timer.current);
    const id = ++requestId.current;
    if (text.trim().length < MIN_LENGTH) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/film-suggest?q=${encodeURIComponent(text.trim())}`);
        const data = await res.json();
        if (id !== requestId.current) return; // veraltete Antwort
        setSuggestions(data.suggestions ?? []);
        setActive(-1);
        setOpen((data.suggestions ?? []).length > 0);
      } catch {
        // Vorschläge sind optional, freie Eingabe bleibt möglich
      }
    }, DEBOUNCE_MS);
  };

  const handleChange = (text: string) => {
    onChange(text);
    onSelectYear(null); // freie Eingabe: Jahr der früheren Auswahl verwerfen
    search(text);
  };

  const select = (s: Suggestion) => {
    requestId.current++; // laufende Suche verwerfen
    clearTimeout(timer.current);
    onChange(s.name);
    onSelectYear(s.year);
    setOpen(false);
    setActive(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault(); // Auswahl statt Formular absenden
      select(suggestions[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="film-suggestions"
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `film-suggestion-${active}` : undefined}
        autoComplete="off"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder="z.B. Frozen, Dumbo..."
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand outline-none"
      />
      {open && (
        <ul
          id="film-suggestions"
          role="listbox"
          className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.name}-${s.year ?? ""}`}
              id={`film-suggestion-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown statt click, damit die Auswahl vor dem Blur des Eingabefelds ankommt
              onMouseDown={(e) => { e.preventDefault(); select(s); }}
              onMouseEnter={() => setActive(i)}
              className={`px-4 py-2 cursor-pointer ${i === active ? "bg-brand-soft" : ""}`}
            >
              <div className="flex justify-between gap-3">
                <span className="font-medium text-gray-900">{s.name}</span>
                {s.year && <span className="text-sm text-gray-500 shrink-0">{s.year}</span>}
              </div>
              {s.alt.length > 0 && (
                <div className="text-xs text-gray-500 truncate">
                  {s.alt.map((a) => `${a.langs.join("/")}: ${a.name}`).join(" · ")}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
