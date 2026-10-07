-- Fehlversuche beim Admin-Login pro IP (Sperre nach zu vielen Fehlversuchen).
-- Im Supabase SQL-Editor ausführen. Ohne die Tabelle nutzt die App einen
-- speicherbasierten Fallback, der auf Vercel nur pro Server-Instanz gilt.
create table if not exists public.admin_login_attempts (
  ip               text primary key,
  failures         integer not null default 0,
  first_failure_at timestamptz not null default now(),
  locked_until     timestamptz
);

-- Nur der Server (Service-Role-Key) darf lesen/schreiben.
alter table public.admin_login_attempts enable row level security;

notify pgrst, 'reload schema';
