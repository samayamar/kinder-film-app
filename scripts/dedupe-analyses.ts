import { createClient } from '@supabase/supabase-js';
import { resolveFilm, toIndexed, FilmRow } from '../lib/filmMatch';

// Bereinigt den Analyse-Cache (Tabelle analyses): Einträge werden auf den Namen und das Jahr der Filmliste gebracht
// (z.B. "dumbo"/ohne Jahr → "Dumbo"/1941). Existiert der kanonische Eintrag schon, wird der doppelte gelöscht,
// sonst wird er umbenannt. Nicht eindeutig zuordenbare Einträge bleiben unverändert.
// Trockenlauf ist Standard, geschrieben wird nur mit --write.
// Aufruf: npx tsx --env-file=.env.local scripts/dedupe-analyses.ts [--write]
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const write = process.argv.includes('--write');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Env-Vars fehlen! .env.local geladen?');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: { transport: () => null as any },
});

interface AnalysisRow {
  id: number | string;
  film_name: string;
  film_year: number | null;
  age: number;
  created_at: string;
}

async function run() {
  const { data: trailers, error } = await supabase
    .from('trailers')
    .select('film_name, film_year, name_de, name_en, name_es')
    .limit(5000);
  if (error) throw error;
  const films = (trailers as FilmRow[]).map(toIndexed);

  const { data, error: aError } = await supabase
    .from('analyses')
    .select('id, film_name, film_year, age, created_at')
    .order('created_at');
  if (aError) throw aError;
  const rows = data as AnalysisRow[];

  const keyOf = (name: string, year: number | null, age: number) => `${name}|${year ?? ''}|${age}`;
  // Zielschlüssel, die schon belegt sind (Einträge, die schon kanonisch sind, haben Vorrang)
  const taken = new Set<string>();
  const plan: { row: AnalysisRow; action: 'ok' | 'delete' | 'update'; name?: string; year?: number | null }[] = [];

  const resolved = rows.map((row) => {
    const r = resolveFilm(films, row.film_name, row.film_year);
    return { row, canon: r ? { name: r.name.toLowerCase().trim(), year: r.year } : null };
  });
  for (const { row, canon } of resolved) {
    if (!canon || (row.film_name === canon.name && row.film_year === canon.year)) taken.add(keyOf(row.film_name, row.film_year, row.age));
  }
  for (const { row, canon } of resolved) {
    if (!canon || (row.film_name === canon.name && row.film_year === canon.year)) {
      plan.push({ row, action: 'ok' });
      continue;
    }
    const target = keyOf(canon.name, canon.year, row.age);
    if (taken.has(target)) plan.push({ row, action: 'delete', name: canon.name, year: canon.year });
    else {
      taken.add(target);
      plan.push({ row, action: 'update', name: canon.name, year: canon.year });
    }
  }

  console.log(`🔎 ${rows.length} Cache-Einträge${write ? ' (Schreibmodus)' : ' (Trockenlauf)'}\n`);
  let deleted = 0;
  let updated = 0;
  for (const p of plan) {
    const label = `"${p.row.film_name}" (${p.row.film_year ?? 'ohne Jahr'}, ${p.row.age}J)`;
    if (p.action === 'ok') continue;
    if (p.action === 'delete') {
      console.log(`🗑️  ${label} → doppelt zu "${p.name}" (${p.year ?? 'ohne Jahr'}), wird gelöscht`);
      if (write) {
        const { error: e } = await supabase.from('analyses').delete().eq('id', p.row.id);
        if (e) throw e;
      }
      deleted++;
    } else {
      console.log(`✏️  ${label} → "${p.name}" (${p.year ?? 'ohne Jahr'})`);
      if (write) {
        const { error: e } = await supabase.from('analyses').update({ film_name: p.name, film_year: p.year }).eq('id', p.row.id);
        if (e) throw e;
      }
      updated++;
    }
  }
  const unchanged = plan.filter((p) => p.action === 'ok').length;
  console.log(`\n${write ? '✅' : '🔎'} ${updated} umbenannt, ${deleted} gelöscht, ${unchanged} unverändert${write ? '' : ' (Trockenlauf, mit --write ausführen)'}`);
}

run();
