'use client';
import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';

interface EnvInfo { name: string; set: boolean; length?: number; problems?: string[] }
interface Health {
  env: EnvInfo[];
  anthropic: { ok: boolean; status: number | null; ms: number; errorType?: string | null; errorMessage?: string | null };
  supabase: { ok: boolean; errorMessage?: string | null };
  deployment: string;
  region: string | null;
}

const HINTS: Record<number, string> = {
  401: 'Der API-Key fehlt oder ist ungültig. In Vercel unter Settings → Environment Variables prüfen und neu deployen.',
  400: 'Meist zu wenig Guthaben im Anthropic-Konto (siehe Meldung).',
  403: 'Der Key darf dieses Modell oder diese Region nicht nutzen.',
  404: 'Das Modell wurde nicht gefunden.',
  429: 'Rate-Limit erreicht, später erneut versuchen.',
  529: 'Anthropic ist gerade überlastet, später erneut versuchen.',
};

export default function HealthPage() {
  const [data, setData] = useState<Health | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const run = () => {
    setLoading(true);
    setError('');
    adminFetch('/api/admin/health')
      .then(r => r.json())
      .then(d => (d.error ? setError(d.error) : setData(d)))
      .catch(() => setError('Ladefehler'))
      .finally(() => setLoading(false));
  };

  useEffect(run, []);

  const badge = (ok: boolean) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ok ? 'bg-good-soft text-good-text' : 'bg-bad-soft text-bad-text'}`}>
      {ok ? 'OK' : 'Fehler'}
    </span>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <a href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Admin</a>
        <h1 className="text-2xl font-bold text-gray-800">🩺 Systemcheck</h1>
      </div>

      {error && <div className="bg-bad-soft border border-bad/30 text-bad-text rounded-lg p-4 mb-6 text-sm">{error}</div>}
      {loading && <p className="text-gray-500">Prüfe…</p>}

      {data && (
        <div className="space-y-6">
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Claude-API {badge(data.anthropic.ok)}</h2>
            <p className="text-sm text-gray-600">
              HTTP-Status: <strong>{data.anthropic.status ?? '–'}</strong> · {data.anthropic.ms} ms
            </p>
            {data.anthropic.errorType && (
              <p className="text-sm text-bad-text mt-2">
                {data.anthropic.errorType}: {data.anthropic.errorMessage}
              </p>
            )}
            {!data.anthropic.errorType && data.anthropic.errorMessage && (
              <p className="text-sm text-bad-text mt-2">{data.anthropic.errorMessage}</p>
            )}
            {data.anthropic.status !== null && HINTS[data.anthropic.status] && (
              <p className="text-sm text-gray-700 mt-2 bg-gray-50 rounded p-3">{HINTS[data.anthropic.status]}</p>
            )}
          </section>

          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Supabase {badge(data.supabase.ok)}</h2>
            {data.supabase.errorMessage && <p className="text-sm text-bad-text">{data.supabase.errorMessage}</p>}
          </section>

          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Umgebungsvariablen</h2>
            <ul className="space-y-2 text-sm">
              {data.env.map(e => (
                <li key={e.name} className="flex flex-wrap items-center gap-2">
                  <code className="text-gray-800">{e.name}</code>
                  {badge(e.set && (e.problems?.length ?? 0) === 0)}
                  <span className="text-gray-500">
                    {!e.set ? 'nicht gesetzt' : `gesetzt, ${e.length} Zeichen`}
                    {e.problems && e.problems.length > 0 && ` – ${e.problems.join('; ')}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <p className="text-xs text-gray-400">Deployment {data.deployment}{data.region ? ` · Region ${data.region}` : ''} · Werte der Variablen werden nie angezeigt.</p>
          <button onClick={run} className="text-sm text-brand hover:text-brand-dark font-medium">↻ Erneut prüfen</button>
        </div>
      )}
    </div>
  );
}
