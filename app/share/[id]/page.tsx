import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ResultView, { AnalysisResult } from "@/components/ResultView";
import { getSharedResult } from "@/lib/results";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const row = await getSharedResult(params.id);
  if (!row) return { title: "Ergebnis nicht gefunden" };
  const result = row.result as AnalysisResult;
  return {
    title: `${result.filmName} für ${result.alter}-Jährige – Filmabend Kids`,
    description: result.begruendung,
  };
}

export default async function SharedResultPage({ params }: Params) {
  const row = await getSharedResult(params.id);
  if (!row) notFound();

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        <header>
          <Link href="/" className="text-2xl font-bold text-brand">
            🎬 Filmabend Kids
          </Link>
          <p className="text-sm text-gray-600">Geteilte Filmanalyse für Kinder</p>
        </header>

        <ResultView result={row.result as AnalysisResult} />

        <Link
          href="/"
          className="block w-full text-center py-3 bg-brand text-white rounded font-semibold hover:bg-brand-dark"
        >
          Eigenen Film analysieren
        </Link>
      </div>
    </div>
  );
}
