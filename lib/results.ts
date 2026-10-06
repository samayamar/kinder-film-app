import { createHash, randomBytes } from 'crypto';
import { supabase } from '@/lib/supabase';

export const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{6,16}$/;

// Postgres-jsonb sortiert Schlüssel um, daher kanonisch serialisieren,
// damit ein gecachtes und ein frisches Ergebnis denselben Hash ergeben.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

interface SaveResultInput {
  result: any;
  filmName: string;
  filmYear?: number | null;
  age: number;
  eigenschaften?: string[];
}

/** Speichert ein Ergebnis (einmalig pro Inhalt) und gibt die Share-ID zurück, bei Fehler null. */
export async function saveResult(input: SaveResultInput): Promise<string | null> {
  try {
    const contentHash = createHash('sha256').update(canonical(input.result)).digest('hex');

    const findExisting = async () => {
      const { data } = await supabase
        .from('shared_results')
        .select('id')
        .eq('content_hash', contentHash)
        .maybeSingle();
      return (data?.id as string | undefined) ?? null;
    };

    const existing = await findExisting();
    if (existing) return existing;

    const id = randomBytes(6).toString('base64url');
    const { error } = await supabase.from('shared_results').insert({
      id,
      content_hash: contentHash,
      film_name: input.filmName,
      film_name_normalized: input.filmName.toLowerCase().trim(),
      film_year: input.filmYear ?? null,
      age: input.age,
      eigenschaften: input.eigenschaften ?? [],
      result: input.result,
    });

    if (error) {
      // Parallele Anfrage könnte denselben Inhalt gerade eingefügt haben
      const raced = await findExisting();
      if (!raced) console.error('shared_results insert fehlgeschlagen:', error.message.slice(0, 200));
      return raced;
    }
    return id;
  } catch (err) {
    console.error('Ergebnis speichern fehlgeschlagen (unkritisch):', err);
    return null;
  }
}

export async function getSharedResult(id: string) {
  if (!SHARE_ID_PATTERN.test(id)) return null;
  const { data } = await supabase
    .from('shared_results')
    .select('result, film_name, age')
    .eq('id', id)
    .maybeSingle();
  return data;
}
