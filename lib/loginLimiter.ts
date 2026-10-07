import { supabase } from '@/lib/supabase';

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000; // Fehlversuche zählen innerhalb dieses Fensters
const LOCK_MS = 15 * 60 * 1000;

interface Attempt {
  failures: number;
  firstFailureAt: number;
  lockedUntil: number | null;
}

// Fallback, falls die Tabelle admin_login_attempts fehlt oder Supabase nicht erreichbar ist.
// Auf globalThis, damit alle Route-Bundles denselben Speicher teilen.
const globalForLimiter = globalThis as unknown as { __adminLoginAttempts?: Map<string, Attempt> };
const memory = (globalForLimiter.__adminLoginAttempts ??= new Map<string, Attempt>());

async function load(ip: string): Promise<Attempt | null> {
  const { data, error } = await supabase
    .from('admin_login_attempts')
    .select('failures, first_failure_at, locked_until')
    .eq('ip', ip)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    failures: data.failures,
    firstFailureAt: new Date(data.first_failure_at).getTime(),
    lockedUntil: data.locked_until ? new Date(data.locked_until).getTime() : null,
  };
}

async function save(ip: string, a: Attempt): Promise<void> {
  const { error } = await supabase.from('admin_login_attempts').upsert({
    ip,
    failures: a.failures,
    first_failure_at: new Date(a.firstFailureAt).toISOString(),
    locked_until: a.lockedUntil ? new Date(a.lockedUntil).toISOString() : null,
  });
  if (error) throw error;
}

async function read(ip: string): Promise<Attempt | null> {
  try {
    return await load(ip);
  } catch {
    return memory.get(ip) ?? null;
  }
}

async function write(ip: string, a: Attempt): Promise<void> {
  try {
    await save(ip, a);
  } catch {
    memory.set(ip, a);
  }
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown'
  );
}

/** Sekunden bis zum Ende der Sperre, oder 0 wenn nicht gesperrt. */
export async function lockedForSeconds(ip: string): Promise<number> {
  const a = await read(ip);
  if (!a?.lockedUntil || a.lockedUntil <= Date.now()) return 0;
  return Math.ceil((a.lockedUntil - Date.now()) / 1000);
}

export async function recordFailure(ip: string): Promise<void> {
  const now = Date.now();
  const prev = await read(ip);
  const fresh = !prev || now - prev.firstFailureAt > WINDOW_MS || (prev.lockedUntil !== null && prev.lockedUntil <= now);
  const failures = (fresh ? 0 : prev!.failures) + 1;
  const locked = failures >= MAX_FAILURES;
  await write(ip, {
    failures: locked ? 0 : failures,
    firstFailureAt: fresh ? now : prev!.firstFailureAt,
    lockedUntil: locked ? now + LOCK_MS : null,
  });
}

export async function clearFailures(ip: string): Promise<void> {
  memory.delete(ip);
  try {
    await supabase.from('admin_login_attempts').delete().eq('ip', ip);
  } catch {
    // unkritisch
  }
}
