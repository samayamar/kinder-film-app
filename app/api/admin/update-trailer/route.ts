import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  // Auth-Check
  const adminKey = req.headers.get('x-admin-key');
  if (adminKey !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, youtube_id, verified } = await req.json();

  if (!id) {
    return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });
  }

  const { error } = await supabase
    .from('trailers')
    .update({
      youtube_id: youtube_id || null,
      verified: verified ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
