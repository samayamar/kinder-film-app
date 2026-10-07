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
      className="w-full py-2 bg-accent text-ink rounded font-semibold hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {!shareId ? "🔗 Teilen nicht verfügbar" : state === "copied" ? "✓ Link kopiert" : "🔗 Teilen"}
    </button>
  );
}
