export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">🎛️ Admin Dashboard</h1>
      <p className="text-gray-500 text-sm">Filmabend Kids v0.3.0</p>
      <div className="mt-8 grid grid-cols-1 gap-4 max-w-md">
        <a href="/admin/trailer-report"
          className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition">
          <div className="text-2xl mb-2">📊</div>
          <div className="font-semibold text-gray-800">Trailer-Report</div>
          <div className="text-sm text-gray-500 mt-1">Fehlende YouTube-IDs nachpflegen</div>
        </a>
        <a href="/admin/feedback"
          className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition">
          <div className="text-2xl mb-2">💬</div>
          <div className="font-semibold text-gray-800">Feedback</div>
          <div className="text-sm text-gray-500 mt-1">Nutzer-Feedback und Bewertungen</div>
        </a>
        <a href="/admin/analytics"
          className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition">
          <div className="text-2xl mb-2">📈</div>
          <div className="font-semibold text-gray-800">Analytics</div>
          <div className="text-sm text-gray-500 mt-1">Top-Filme und Altersgruppen</div>
        </a>
        <a href="/admin/health"
          className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition">
          <div className="text-2xl mb-2">🩺</div>
          <div className="font-semibold text-gray-800">Systemcheck</div>
          <div className="text-sm text-gray-500 mt-1">Claude-API, Datenbank und Umgebungsvariablen prüfen</div>
        </a>
      </div>
    </div>
  );
}
