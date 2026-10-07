import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Importiert lib/data/films-extra.json in die Tabelle trailers (nur neue Titel, ohne YouTube-ID).
// Aufruf: npx tsx --env-file=.env.local scripts/import-films-extra.ts [--dry-run]
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const dryRun = process.argv.includes('--dry-run');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Env-Vars fehlen! .env.local geladen?');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: { transport: () => null as any },
});

interface FilmEntry {
  nameDe: string;
  nameEn: string;
  nameEs: string;
  year: number;
}

async function run() {
  const films: FilmEntry[] = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'lib/data/films-extra.json'), 'utf-8')
  );

  const { data: existing, error: readError } = await supabase
    .from('trailers')
    .select('film_name_normalized');
  if (readError) {
    console.error('❌ Lesen fehlgeschlagen:', readError.message);
    process.exit(1);
  }
  const known = new Set((existing ?? []).map((r) => r.film_name_normalized));

  const rows = films
    .filter((f) => !known.has(f.nameDe.toLowerCase().trim()))
    .map((f) => ({
      film_name: f.nameDe,
      film_name_normalized: f.nameDe.toLowerCase().trim(),
      film_year: f.year,
      youtube_id: null,
      fsk: null,
      type: 'movie',
      streaming: null,
      verified: false,
      name_de: f.nameDe,
      name_en: f.nameEn,
      name_es: f.nameEs,
    }));

  console.log(`📦 ${films.length} in Datei, ${films.length - rows.length} schon vorhanden, ${rows.length} neu`);
  if (dryRun || rows.length === 0) {
    console.log(dryRun ? '🔎 Dry-Run: nichts geschrieben' : 'Nichts zu tun');
    return;
  }

  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabase.from('trailers').insert(rows.slice(i, i + 100));
    if (error) {
      console.error('❌ Import fehlgeschlagen:', error.message);
      process.exit(1);
    }
  }
  console.log('✅ Import erfolgreich');
}

run();
