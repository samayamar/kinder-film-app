import { NextRequest, NextResponse } from 'next/server';
import { matchesAdminPassword } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD nicht gesetzt' }, { status: 500 });
  }

  if (typeof password !== 'string' || !matchesAdminPassword(password)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
