'use client';
import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';

interface Trailer {
  id: number;
  film_name: string;
  film_year: number | null;
  youtube_id: string | null;
  verified: boolean;
  type: string;
  search_count: number;
}

type Filter = 'all' | 'missing' | 'unverified';

export default function TrailerReportPage() {
  const [trailers, setTrailers]   = useState<Trailer[]>([]);
  const [filter, setFilter]       = useState<Filter>('all');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [editId, setEditId]       = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState('');

  const load = () => {
    setLoading(true);
    adminFetch('/api/admin/trailer-report')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setTrailers(data.trailers);
      })
      .catch(() => setError('Ladefehler'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleEdit = (t: Trailer) => {
    setEditId(t.id);
    setEditValue(t.youtube_id ?? '');
    setSaveMsg('');
  };

  const handleCancel = () => {
    setEditId(null);
    setEditValue('');
  };

  const handleSave = async (id: number) => {
    setSaving(true);
    setSaveMsg('');
    const newYoutubeId  = editValue.trim() || null;
    const newVerified   = !!editValue.trim();

    try {
      const res = await adminFetch('/api/admin/update-trailer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, youtube_id: newYoutubeId, verified: newVerified }),
      });

      if (res.ok) {
        setTrailers(prev =>
          prev.map(t =>
            t.id === id
              ? { ...t, youtube_id: newYoutubeId, verified: newVerified }
              : t
          )
        );
        setSaveMsg('✅ Gespeichert');
        setEditId(null);
        setEditValue('');
      } else {
        const data = await res.json();
        setSaveMsg(`❌ ${data.error ?? 'Fehler'}`);
      }
    } catch {
      setSaveMsg('❌ Verbindungsfehler');
    }

    setSaving(false);
  };

  const filtered = trailers
    .filter(t => {
      if (filter === 'missing')    return !t.youtube_id;
      if (filter === 'unverified') return t.youtube_id && !t.verified;
      return true;
    })
    .sort((a, b) => b.search_count - a.search_count);

  const liveStats = {
    total:      trailers.length,
    withId:     trailers.filter(t => t.youtube_id).length,
    missing:    trailers.filter(t => !t.youtube_id).length,
    verified:   trailers.filter(t => t.verified).length,
    unverified: trailers.filter(t => t.youtube_id && !t.verified).length,
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Lade Daten...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <a href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Admin</a>
          <h1 className="text-2xl font-bold text-gray-800">📊 Trailer-Report</h1>
        </div>
        {saveMsg && <span className="text-sm font-medium">{saveMsg}</span>}
      </div>

      {error && (
        <div className="bg-bad-soft border border-bad/30 text-bad-text rounded-lg p-4 mb-6 text-sm">{error}</div>
      )}

      {/* Stats — live aus trailers-State berechnet */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Gesamt',        value: liveStats.total,      color: 'text-gray-800',   bg: 'bg-white' },
          { label: 'Mit ID',        value: liveStats.withId,     color: 'text-good-text',  bg: 'bg-good-soft' },
          { label: 'Fehlend',       value: liveStats.missing,    color: 'text-bad-text',    bg: 'bg-bad-soft' },
          { label: 'Verifiziert',   value: liveStats.verified,   color: 'text-brand-dark',   bg: 'bg-brand-soft' },
          { label: 'Unverifiziert', value: liveStats.unverified, color: 'text-caution-text', bg: 'bg-caution-soft' },
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
          { key: 'all',        label: `Alle (${trailers.length})` },
          { key: 'missing',    label: `🔴 Fehlend (${liveStats.missing})` },
          { key: 'unverified', label: `🟡 Unverifiziert (${liveStats.unverified})` },
        ] as { key: Filter; label: string }[]).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f.key
                ? 'bg-brand text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tabelle */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Film</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Jahr</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Typ</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">YouTube-ID</th>
              <th className="text-center px-4 py-3 text-gray-600 font-medium">Verifiziert</th>
              <th className="text-center px-4 py-3 text-gray-600 font-medium">Suchen</th>
              <th className="text-center px-4 py-3 text-gray-600 font-medium">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{t.film_name}</td>
                <td className="px-4 py-3 text-gray-500">{t.film_year ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    t.type === 'movie' ? 'bg-brand-soft text-brand-dark' : 'bg-accent-soft text-accent-text'
                  }`}>
                    {t.type === 'movie' ? '🎬 Film' : '📺 Serie'}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {editId === t.id ? (
                    <input
                      id={`edit-${t.id}`}
                      name={`edit-${t.id}`}
                      autoFocus
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter')  handleSave(t.id);
                        if (e.key === 'Escape') handleCancel();
                      }}
                      placeholder="YouTube-ID"
                      className="border border-brand-soft rounded px-2 py-1 text-xs w-36 focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  ) : t.youtube_id ? (
                    <span className="text-good-text">{t.youtube_id}</span>
                  ) : (
                    <span className="text-bad-text font-sans font-medium">Fehlt</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {t.verified ? <span className="text-good-text">✅</span> : <span className="text-gray-300">○</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {t.search_count > 0
                    ? <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium">{t.search_count}×</span>
                    : <span className="text-gray-300 text-xs">—</span>
                  }
                </td>
                <td className="px-4 py-3 text-center">
                  {editId === t.id ? (
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => handleSave(t.id)}
                        disabled={saving}
                        className="bg-brand text-white px-3 py-1 rounded text-xs font-medium hover:bg-brand-dark disabled:opacity-50"
                      >
                        {saving ? '...' : 'Speichern'}
                      </button>
                      <button
                        onClick={handleCancel}
                        className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs font-medium hover:bg-gray-300"
                      >
                        Abbrechen
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit(t)}
                      className="text-brand hover:text-brand-dark text-xs font-medium"
                    >
                      ✏️ Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">Keine Einträge für diesen Filter.</div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        {filtered.length} Einträge · Sortiert nach Häufigkeit · Enter = Speichern · Esc = Abbrechen
      </p>
    </div>
  );
}
