import HowItWorks from "@/components/HowItWorks";

export default function Header() {
  return (
    <header className="bg-white shadow">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-4xl font-bold text-indigo-600">🎬 Filmabend Kids</h1>
        <p className="text-gray-600 mt-2">Sichere Filmanalyse für empfindliche Kinder</p>
        <HowItWorks />
      </div>
    </header>
  );
}
