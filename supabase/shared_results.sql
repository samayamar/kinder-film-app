-- Alle Analyse-Ergebnisse, jeweils mit kurzer ID für den Share-Link (/share/<id>).
-- Im Supabase SQL-Editor ausführen.
create table if not exists public.shared_results (
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

create index if not exists shared_results_film_age_idx
  on public.shared_results (film_name_normalized, age);

-- Nur der Server (Service-Role-Key) darf lesen/schreiben, nie der anon-Key.
alter table public.shared_results enable row level security;
