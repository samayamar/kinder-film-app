import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { saveResult } from '@/lib/results';

const MIN_SCORE = 7; // Eignung ab 70 %
const COUNT = 2;
const POOL = 8; // so viele der bestbewerteten Filme kommen als Auswahl in Frage

/** Einfacher stabiler Hash, damit ein Film immer dieselben Alternativen bekommt, verschiedene Filme aber unterschiedliche. */
function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/**
 * GET /api/alternatives?age=5&film=Dumbo
 * Liefert bis zu zwei Filme aus dem Analyse-Cache für dasselbe Alter mit mindestens 70 % Eignung
 * (ohne den angefragten Film), jeweils mit Share-Link.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const age = Number(params.get('age'));
  const film = (params.get('film') ?? '').slice(0, 200).toLowerCase().trim();
  if (!Number.isInteger(age) || age < 1 || age > 17) {
    return NextResponse.json({ alternatives: [] }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('analyses')
      .select('film_name, film_year, result')
      .eq('age', age);
    if (error) throw error;

    const candidates = (data ?? [])
      .filter((r) => typeof r.result?.gesamtscore === 'number' && r.result.gesamtscore >= MIN_SCORE)
      .filter((r) => String(r.result.filmName ?? '').toLowerCase().trim() !== film && r.film_name !== film)
      .sort(
        (a, b) =>
          b.result.gesamtscore - a.result.gesamtscore ||
          String(a.result.filmName).localeCompare(String(b.result.filmName), 'de')
      )
      .slice(0, POOL);

    // Die bestbewerteten Filme haben Vorrang. Gibt es genug mit der Höchstnote, wird unter diesen je nach Film
    // abgewechselt, sonst steht der beste fest und der zweite wechselt unter den übrigen.
    const top = candidates.length ? candidates[0].result.gesamtscore : 0;
    const tier = candidates.filter((r) => r.result.gesamtscore === top);
    let chosen: typeof candidates;
    if (tier.length >= COUNT) {
      const start = hash(film) % tier.length;
      chosen = Array.from({ length: COUNT }, (_, i) => tier[(start + i) % tier.length]);
    } else {
      const rest = candidates.slice(tier.length);
      chosen = rest.length ? [...tier, rest[hash(film) % rest.length]].slice(0, COUNT) : tier;
    }

    const alternatives = await Promise.all(
      chosen.map(async (r) => ({
        name: String(r.result.filmName),
        score: Math.round(r.result.gesamtscore * 10),
        ampel: String(r.result.ampel ?? ''),
        shareId: await saveResult({ result: r.result, filmName: r.film_name, filmYear: r.film_year, age }),
      }))
    );

    return NextResponse.json({ alternatives: alternatives.filter((a) => a.shareId) });
  } catch (err) {
    console.error('Alternativen nicht abrufbar (unkritisch):', err);
    return NextResponse.json({ alternatives: [] });
  }
}
