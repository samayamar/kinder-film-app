import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Env-Vars fehlen! .env.local geladen?');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: { transport: () => null as any },  // ← FIX: Realtime deaktiviert
});

interface TrailerEntry {
  filmName: string;
  youtubeId: string;
  year?: number;
  fsk?: string;
}

interface SeriesEntry {
  seriesName: string;
  youtubeId: string;
  year?: number;
  streaming?: string;
}

interface TrailersJson {
  trailers: TrailerEntry[];
  series: SeriesEntry[];
}

async function migrate() {
  const filePath = path.join(process.cwd(), 'lib/data/trailers.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data: TrailersJson = JSON.parse(raw);

  const movies = data.trailers.map((t) => ({
    film_name: t.filmName,
    film_name_normalized: t.filmName.toLowerCase().trim(),
    film_year: t.year ?? null,
    youtube_id: t.youtubeId === 'pending' ? null : t.youtubeId,
    fsk: t.fsk ?? null,
    type: 'movie',
    streaming: null,
    verified: false,
  }));

  const series = data.series.map((s) => ({
    film_name: s.seriesName,
    film_name_normalized: s.seriesName.toLowerCase().trim(),
    film_year: s.year ?? null,
    youtube_id: s.youtubeId === 'pending' ? null : s.youtubeId,
    fsk: null,
    type: 'series',
    streaming: s.streaming ?? null,
    verified: false,
  }));

  const all = [...movies, ...series];

  console.log(`📦 Migriere ${movies.length} Filme + ${series.length} Serien = ${all.length} Einträge`);

  const { error } = await supabase.from('trailers').insert(all);

  if (error) {
    console.error('❌ Migration fehlgeschlagen:', error.message);
    process.exit(1);
  }

  console.log('✅ Migration erfolgreich!');
  console.log('📁 trailers.json bleibt als Backup erhalten');
}

migrate();
