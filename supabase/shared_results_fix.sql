-- Einmalig ausführen: ersetzt die bestehende, leere Tabelle shared_results
-- (nur id int8 + created_at) durch die Version mit allen Spalten.
-- ACHTUNG: löscht die Tabelle samt Inhalt. Zum Zeitpunkt der Erstellung hatte sie 0 Zeilen.
drop table if exists public.shared_results;

create table public.shared_results (
  id                   text primary key,
  content_hash         text not null unique,
  film_name            text not null,
  film_name_normalized text not null,
  film_year            integer,
  age                  integer not null,
  eigenschaften        jsonb not null default '[]'::jsonb,
  result               jsonb not null,
  created_at           timestamptz not null default now()
);

create index shared_results_film_age_idx
  on public.shared_results (film_name_normalized, age);

-- Nur der Server (Service-Role-Key) darf lesen/schreiben, nie der anon-Key.
alter table public.shared_results enable row level security;

-- PostgREST-Schema-Cache neu laden, damit die neuen Spalten sofort sichtbar sind.
notify pgrst, 'reload schema';
