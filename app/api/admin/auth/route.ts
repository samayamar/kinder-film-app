import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  const denied = await checkAdminPassword(req, typeof password === 'string' ? password : null);
  if (denied) return denied;

  return NextResponse.json({ success: true });
}
