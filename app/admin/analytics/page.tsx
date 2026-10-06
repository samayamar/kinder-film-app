'use client';
import { useEffect, useState } from 'react';

interface TopFilm {
  film_name: string;
  count: number;
}

interface AgeGroup {
  age: number;
  count: number;
}

interface Stats {
  totalSearches: number;
  cacheHits: number;
  topFilms: TopFilm[];
  ageGroups: AgeGroup[];
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setStats(data);
      })
      .catch(() => setError('Ladefehler'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Lade Analytics...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex items-center gap-4 mb-8">
        <a href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Admin</a>
        <h1 className="text-2xl font-bold text-gray-800">📈 Analytics</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">{error}</div>
      )}

      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">

          {/* Stats Header */}
          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Gesamt Suchanfragen', value: stats.totalSearches, color: 'text-gray-800',  bg: 'bg-white' },
              { label: 'Cache Hits',          value: stats.cacheHits,     color: 'text-green-700', bg: 'bg-green-50' },
              { label: 'Claude API Calls',    value: stats.totalSearches - stats.cacheHits, color: 'text-blue-700', bg: 'bg-blue-50' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-gray-100 shadow-sm`}>
                <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Top 10 Filme */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">🎬 Top 10 meistgesuchte Filme</h2>
            {stats.topFilms.length === 0 ? (
              <p className="text-gray-400 text-sm">Noch keine Daten.</p>
            ) : (
              <div className="space-y-3">
                {stats.topFilms.map((film, idx) => (
                  <div key={film.film_name} className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm w-5 text-right">{idx + 1}.</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 capitalize">{film.film_name}</span>
                        <span className="text-xs text-gray-500">{film.count}×</span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${Math.round((film.count / stats.topFilms[0].count) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Altersgruppen */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">👧 Anfragen nach Alter</h2>
            {stats.ageGroups.length === 0 ? (
              <p className="text-gray-400 text-sm">Noch keine Daten.</p>
            ) : (
              <div className="space-y-3">
                {stats.ageGroups.map(group => {
                  const pct = Math.round((group.count / stats.totalSearches) * 100);
                  return (
                    <div key={group.age} className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-14 shrink-0">{group.age} Jahre</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="bg-gray-100 rounded-full h-1.5 flex-1 mr-2">
                            <div
                              className="bg-purple-500 h-1.5 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-16 text-right">{group.count}× ({pct}%)</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
