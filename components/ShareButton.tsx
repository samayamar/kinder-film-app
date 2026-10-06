"use client";

import { useState } from "react";

export default function ShareButton({ shareId, filmName }: { shareId?: string | null; filmName: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  const handleShare = async () => {
    if (!shareId) return;
    const url = `${window.location.origin}/share/${shareId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Filmabend Kids: ${filmName}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch (err) {
      // Abbrechen des Teilen-Dialogs ist kein Fehler
      if (err instanceof DOMException && err.name === "AbortError") return;
      window.prompt("Link zum Teilen kopieren:", url);
      setState("error");
    }
    setTimeout(() => setState("idle"), 2500);
  };

  return (
    <button
      onClick={handleShare}
      disabled={!shareId}
      title={shareId ? undefined : "Link konnte nicht erstellt werden"}
      className="w-full py-3 bg-indigo-600 text-white rounded-lg shadow-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {!shareId ? "🔗 Teilen derzeit nicht verfügbar" : state === "copied" ? "✓ Link kopiert" : "🔗 Ergebnis teilen"}
    </button>
  );
}
