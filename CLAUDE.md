# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Kinder-Film-Analyzer (package name `kinder-film-analyzer`): a German-language Next.js 14 (App Router) + TypeScript + Tailwind app that rates films/series for sensitive children by age, using Claude. Deployed on Vercel. UI text, prompts, DB columns and log messages are mostly German.

## Commands

```bash
npm run dev        # dev server on http://localhost:3000
npm run build      # production build (also runs type check + lint)
npm run lint       # next lint
npx tsc --noEmit   # type check only
npx tsx --env-file=.env.local scripts/migrate-trailers.ts   # one-off: load lib/data/trailers.json into Supabase `trailers`
```

There is no test suite. `tsconfig.json` is `strict` with `noUnusedLocals`/`noUnusedParameters`, so unused imports fail the build. `scripts/` is excluded from `tsconfig`.

Required env vars (`.env.local`, gitignored; `.env.example` only lists the Anthropic key): `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`. `lib/supabase.ts` throws at import time if the Supabase vars are missing, so every route that imports it fails without them.

## Architecture

**Analysis flow** (`app/api/analyze/route.ts`, the core of the app):
1. Look up a cached result in Supabase `analyses` (key: normalized lowercase film name + age + year-or-null). Skipped entirely when the request has `eigenschaften` (custom child traits), and such results are also never cached.
2. Fetch trailer info by calling `/api/trailer` over HTTP on its own origin (only used for logging).
3. Call the Anthropic Messages API with plain `fetch` (model `claude-sonnet-4-6`, system prompt defines the JSON schema: five 1–10 risk scores, `gesamtscore`, `ampel`, `kritische_szenen`, ...) and `JSON.parse` the reply. Model output is not validated against the schema.
4. Insert into `analyses`, then write a row to `search_log`. Cache and log failures are swallowed on purpose ("unkritisch"); only the Claude call failing returns a 500.

**Share links**: every analysis result (cache hit or fresh, with or without `eigenschaften`) is stored via `lib/results.ts` in Supabase `shared_results`, deduplicated by a SHA-256 of the canonicalized result, and `/api/analyze` returns the 8-char `shareId` alongside the result. `/share/[id]` is a server-rendered page reusing `components/ResultView.tsx`. Links are created at analysis time, not on click, so only real model output is reachable; if saving fails, `shareId` is `null` and `ShareButton` renders disabled. The table schema lives in `supabase/shared_results.sql` (no migration runner; run it in the Supabase SQL editor, and `shared_results_fix.sql` is a one-off that replaces a wrongly created table).

**Trailers**: `/api/trailer` resolves YouTube IDs from Supabase `trailers` in three passes (name+year, name as movie, name as series). `lib/data/trailers.json` is the seed data for that table, loaded with `scripts/migrate-trailers.ts`. Entries with `youtubeId: "pending"` become `null` and are meant to be filled in via the admin trailer report.

**Other API routes**: `/api/search-film` uses the `@anthropic-ai/sdk` client directly (the analyze route uses raw `fetch` instead); `/api/streaming` returns static werstreamt.es/kino.de search links and a hard-coded provider list, with no real availability lookup; `/api/feedback` inserts into `feedback`.

**Client state**: saved analyses/favorites live only in the browser (`localStorage`, key `filmabend-kids-analyses`, via `lib/useAnalysisStorage.ts`) and are addressed by array index, not by ID. There are no user accounts.

**Admin area** (`/admin`, `/admin/analytics`, `/admin/feedback`, `/admin/trailer-report`): protected only client-side. `app/admin/layout.tsx` posts the password to `/api/admin/auth`, then stores a flag and the plaintext password in `sessionStorage`. Of the server routes under `app/api/admin/`, only `auth` and `update-trailer` check the password (`update-trailer` reads it from the `x-admin-key` header). The `analytics`, `feedback` and `trailer-report` routes currently perform no auth check, so any new admin route needs its own check.

**Supabase** is accessed server-side only, always through the service-role client from `lib/supabase.ts`. Tables used: `analyses`, `trailers`, `search_log`, `feedback`. The schema is not in the repo.

## Gotchas

- `next build` prints a non-fatal `localStorage is not defined` error while prerendering `/favorites`, because `getAnalyses()` is called during render instead of in an effect. The build still succeeds.
- The README is partly outdated (describes the v1 single-route layout and only `ANTHROPIC_API_KEY`).
