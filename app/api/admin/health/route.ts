import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/adminAuth';

export const maxDuration = 30;

/** Beschreibt eine Umgebungsvariable, ohne ihren Wert preiszugeben. */
function describeEnv(name: string, expectedPrefix?: string) {
  const raw = process.env[name];
  if (raw === undefined) return { name, set: false };
  const trimmed = raw.trim();
  const problems: string[] = [];
  if (raw === '') problems.push('leer');
  if (raw !== trimmed) problems.push('Leerzeichen oder Zeilenumbruch am Rand');
  if (/^["'].*["']$/.test(trimmed)) problems.push('in Anführungszeichen');
  if (trimmed.startsWith(`${name}=`)) problems.push(`beginnt mit "${name}=" (nur den Wert eintragen)`);
  if (expectedPrefix && !trimmed.startsWith(expectedPrefix)) problems.push(`beginnt nicht mit "${expectedPrefix}"`);
  return { name, set: true, length: raw.length, problems };
}

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const env = [
    describeEnv('ANTHROPIC_API_KEY', 'sk-ant-'),
    describeEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://'),
    describeEnv('SUPABASE_SERVICE_ROLE_KEY'),
    describeEnv('ADMIN_PASSWORD'),
  ];

  // Minimaler Claude-Aufruf (1 Token) mit demselben Modell wie die Analyse
  let anthropic: Record<string, unknown>;
  const started = Date.now();
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    });
    const body = await res.json().catch(() => null);
    anthropic = {
      ok: res.ok,
      status: res.status,
      ms: Date.now() - started,
      errorType: body?.error?.type ?? null,
      errorMessage: body?.error?.message ?? null,
    };
  } catch (err) {
    anthropic = { ok: false, status: null, ms: Date.now() - started, errorMessage: String(err).slice(0, 300) };
  }

  let supabaseCheck: Record<string, unknown>;
  try {
    const { error } = await supabase.from('trailers').select('id').limit(1);
    supabaseCheck = { ok: !error, errorMessage: error?.message?.slice(0, 200) ?? null };
  } catch (err) {
    supabaseCheck = { ok: false, errorMessage: String(err).slice(0, 200) };
  }

  return NextResponse.json({
    env,
    anthropic,
    supabase: supabaseCheck,
    deployment: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'lokal',
    region: process.env.VERCEL_REGION ?? null,
  });
}
