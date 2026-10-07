import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Trägt name_de/name_en/name_es für die ursprünglichen Einträge in trailers nach
// (nur Zeilen, bei denen name_de noch leer ist). film_name bleibt unverändert.
// Aufruf: npx tsx --env-file=.env.local scripts/backfill-names.ts [--dry-run]
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

type Names = { nameDe: string; nameEn: string | null; nameEs: string | null };

async function run() {
  const names: Record<string, Names> = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'lib/data/names-existing.json'), 'utf-8')
  );

  let updated = 0;
  let skipped = 0;
  const notFound: string[] = [];

  for (const [filmName, n] of Object.entries(names)) {
    const normalized = filmName.toLowerCase().trim();
    const { data, error } = await supabase
      .from('trailers')
      .select('id, name_de')
      .eq('film_name_normalized', normalized);
    if (error) {
      console.error('❌ Lesen fehlgeschlagen:', error.message);
      process.exit(1);
    }
    const open = (data ?? []).filter((r) => r.name_de === null);
    if (!data || data.length === 0) {
      notFound.push(filmName);
      continue;
    }
    if (open.length === 0) {
      skipped++;
      continue;
    }
    if (!dryRun) {
      const { error: upError } = await supabase
        .from('trailers')
        .update({ name_de: n.nameDe, name_en: n.nameEn, name_es: n.nameEs })
        .in('id', open.map((r) => r.id));
      if (upError) {
        console.error(`❌ Update für "${filmName}" fehlgeschlagen:`, upError.message);
        process.exit(1);
      }
    }
    updated += open.length;
  }

  console.log(`${dryRun ? '🔎 Dry-Run: ' : ''}${updated} Zeilen ${dryRun ? 'würden aktualisiert' : 'aktualisiert'}, ${skipped} schon befüllt, ${notFound.length} nicht gefunden`);
  if (notFound.length) console.log('Nicht gefunden:', notFound);
}

run();
