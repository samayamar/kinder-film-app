import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { film_name, film_year, age, rating, comment, helpful } = body;

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Ungültige Bewertung' }, { status: 400 });
  }

  const { error } = await supabase.from('feedback').insert({
    film_name: film_name ?? null,
    film_year: film_year ?? null,
    age: age ?? null,
    rating,
    comment: comment ?? null,
    helpful: helpful ?? null,
  });

  if (error) {
    console.error('Feedback Supabase Fehler:', error.message, error.details, error.hint);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
