'use client';
import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';

interface FeedbackEntry {
  id: number;
  film_name: string | null;
  age: number | null;
  rating: number;
  comment: string | null;
  helpful: boolean | null;
  created_at: string;
}

export default function FeedbackPage() {
  const [entries, setEntries]   = useState<FeedbackEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [filter, setFilter]     = useState<'all' | 'critical' | 'positive'>('all');

  useEffect(() => {
    adminFetch('/api/admin/feedback')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setEntries(data.entries);
      })
      .catch(() => setError('Ladefehler'))
      .finally(() => setLoading(false));
  }, []);

  const avgRating = entries.length
    ? (entries.reduce((s, e) => s + e.rating, 0) / entries.length).toFixed(1)
    : '—';

  const filtered = entries.filter(e => {
    if (filter === 'critical') return e.rating <= 3;
    if (filter === 'positive') return e.rating >= 4;
    return true;
  });

  const stars = (rating: number) => '⭐'.repeat(rating) + '☆'.repeat(5 - rating);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Lade Feedback...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex items-center gap-4 mb-8">
        <a href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Admin</a>
        <h1 className="text-2xl font-bold text-gray-800">💬 Feedback</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Gesamt',       value: entries.length,                              color: 'text-gray-800',  bg: 'bg-white' },
          { label: 'Ø Bewertung',  value: `${avgRating} ⭐`,                           color: 'text-yellow-700',bg: 'bg-yellow-50' },
          { label: 'Positiv (4-5)',value: entries.filter(e => e.rating >= 4).length,   color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Kritisch (1-3)',value: entries.filter(e => e.rating <= 3).length,  color: 'text-red-700',   bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-gray-100 shadow-sm`}>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {([
          { key: 'all',      label: `Alle (${entries.length})` },
          { key: 'critical', label: `🔴 Kritisch (${entries.filter(e => e.rating <= 3).length})` },
          { key: 'positive', label: `🟢 Positiv (${entries.filter(e => e.rating >= 4).length})` },
        ] as { key: 'all' | 'critical' | 'positive'; label: string }[]).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Feedback Liste */}
      <div className="space-y-3 max-w-3xl">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">
            Noch kein Feedback vorhanden.
          </div>
        ) : (
          filtered.map(e => (
            <div key={e.id} className={`bg-white rounded-xl border shadow-sm p-4 ${
              e.rating <= 3 ? 'border-red-100' : 'border-gray-100'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-800">
                      {e.film_name ? `${e.film_name}${e.age ? ` · ${e.age}J` : ''}` : 'Allgemeines Feedback'}
                    </span>
                    {e.helpful !== null && (
                      <span className="text-xs text-gray-400">
                        {e.helpful ? '👍 Gesehen' : '👎 Nicht gesehen'}
                      </span>
                    )}
                  </div>
                  {e.comment && (
                    <p className="text-sm text-gray-600 mt-1">„{e.comment}"</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm">{stars(e.rating)}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(e.created_at).toLocaleDateString('de-DE')}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
