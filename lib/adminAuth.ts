import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

function matchesAdminPassword(candidate: string | null | undefined): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Prüft den x-admin-key-Header. Gibt bei Fehler eine Antwort zurück, sonst null. */
export function requireAdmin(req: Request): NextResponse | null {
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD nicht gesetzt' }, { status: 500 });
  }
  if (!matchesAdminPassword(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export { matchesAdminPassword };
