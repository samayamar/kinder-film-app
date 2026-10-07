import { NextResponse } from 'next/server';
import { searchFilms } from '@/lib/filmSearch';

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q') ?? '';
  try {
    return NextResponse.json({ suggestions: await searchFilms(q) });
  } catch (err) {
    console.error('Filmvorschläge fehlgeschlagen (unkritisch):', err);
    return NextResponse.json({ suggestions: [] });
  }
}
