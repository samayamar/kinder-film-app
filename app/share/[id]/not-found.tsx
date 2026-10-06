import Link from "next/link";

export default function ShareNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
        <div className="text-5xl mb-4">🎬</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Ergebnis nicht gefunden</h1>
        <p className="text-gray-600 mb-6">Dieser Link ist ungültig oder das Ergebnis existiert nicht mehr.</p>
        <Link href="/" className="inline-block px-4 py-2 bg-indigo-600 text-white rounded font-semibold hover:bg-indigo-700">
          Film analysieren
        </Link>
      </div>
    </div>
  );
}
