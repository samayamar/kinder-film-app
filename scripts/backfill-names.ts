import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Trägt name_de/name_en/name_es für die ursprünglichen Einträge in trailers nach.
// Füllt nur leere Felder, überschreibt nie vorhandene Namen. film_name bleibt unverändert.
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
      .select('id, name_de, name_en, name_es')
      .eq('film_name_normalized', normalized);
    if (error) {
      console.error('❌ Lesen fehlgeschlagen:', error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) {
      notFound.push(filmName);
      continue;
    }
    for (const row of data) {
      const patch: Record<string, string> = {};
      if (row.name_de === null) patch.name_de = n.nameDe;
      if (row.name_en === null && n.nameEn) patch.name_en = n.nameEn;
      if (row.name_es === null && n.nameEs) patch.name_es = n.nameEs;
      if (Object.keys(patch).length === 0) {
        skipped++;
        continue;
      }
      if (!dryRun) {
        const { error: upError } = await supabase.from('trailers').update(patch).eq('id', row.id);
        if (upError) {
          console.error(`❌ Update für "${filmName}" fehlgeschlagen:`, upError.message);
          process.exit(1);
        }
      }
      updated++;
    }
  }

  console.log(`${dryRun ? '🔎 Dry-Run: ' : ''}${updated} Zeilen ${dryRun ? 'würden aktualisiert' : 'aktualisiert'}, ${skipped} unverändert, ${notFound.length} nicht gefunden`);
  if (notFound.length) console.log('Nicht gefunden:', notFound);
}

run();
