-- Mehrsprachige Filmnamen für die Tabelle trailers.
-- Im Supabase SQL-Editor ausführen, danach: npx tsx --env-file=.env.local scripts/import-films-extra.ts
alter table public.trailers
  add column if not exists name_de text,
  add column if not exists name_en text,
  add column if not exists name_es text;

notify pgrst, 'reload schema';
