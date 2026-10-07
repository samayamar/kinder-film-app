import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { clearFailures, getClientIp, lockedForSeconds, recordFailure } from '@/lib/loginLimiter';

function matchesAdminPassword(candidate: string | null | undefined): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function lockedResponse(seconds: number) {
  return NextResponse.json(
    { error: `Zu viele Fehlversuche. Bitte in ${Math.ceil(seconds / 60)} Min. erneut versuchen.` },
    { status: 429, headers: { 'Retry-After': String(seconds) } }
  );
}

/**
 * Prüft ein Admin-Passwort mit Sperre nach zu vielen Fehlversuchen pro IP.
 * Gibt bei Fehler eine Antwort zurück, sonst null. Ein fehlendes Passwort zählt nicht als Fehlversuch.
 */
export async function checkAdminPassword(req: Request, candidate: string | null | undefined): Promise<NextResponse | null> {
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD nicht gesetzt' }, { status: 500 });
  }

  const ip = getClientIp(req);
  const locked = await lockedForSeconds(ip);
  if (locked > 0) return lockedResponse(locked);

  if (!candidate) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!matchesAdminPassword(candidate)) {
    await recordFailure(ip);
    const nowLocked = await lockedForSeconds(ip);
    if (nowLocked > 0) return lockedResponse(nowLocked);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await clearFailures(ip);
  return null;
}

/** Prüft den x-admin-key-Header (siehe checkAdminPassword). */
export function requireAdmin(req: Request) {
  return checkAdminPassword(req, req.headers.get('x-admin-key'));
}
