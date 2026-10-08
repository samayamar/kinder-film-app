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

`scripts/fetch-trailers.ts` fills missing YouTube IDs from TMDB (needs `TMDB_API_KEY` in `.env.local`): it matches by title and year, prefers German then English official trailers, checks each video with YouTube oEmbed (exists and embeddable), and saves it as `verified = false`. It is a dry run unless `--write` is given; `--replace-broken` also audits existing IDs and replaces dead or non-trailer videos. `/admin/trailer-report` has an inline preview with approve/reject for review.

**Other API routes**: `/api/search-film` uses the `@anthropic-ai/sdk` client directly (the analyze route uses raw `fetch` instead); `/api/streaming` returns static werstreamt.es/kino.de search links and a hard-coded provider list, with no real availability lookup; `/api/feedback` inserts into `feedback`.

**Client state**: saved analyses/favorites live only in the browser (`localStorage`, key `filmabend-kids-analyses`, via `lib/useAnalysisStorage.ts`) and are addressed by array index, not by ID. There are no user accounts.

**Admin area** (`/admin`, `/admin/analytics`, `/admin/feedback`, `/admin/trailer-report`): `app/admin/layout.tsx` is only a client-side login gate (posts the password to `/api/admin/auth`, then keeps a flag and the plaintext password in `sessionStorage`). Real protection is server-side: every route under `app/api/admin/` must call `await requireAdmin(req)` from `lib/adminAuth.ts` (checks the `x-admin-key` header; admin pages use `adminFetch` from `lib/adminFetch.ts` to send it). Wrong passwords are counted per client IP in `lib/loginLimiter.ts`: 5 failures within 15 min lock that IP for 15 min (HTTP 429). State lives in Supabase `admin_login_attempts` (`supabase/admin_login_attempts.sql`); if that table is missing it falls back to an in-memory map, which on Vercel is per instance only.

**Supabase** is accessed server-side only, always through the service-role client from `lib/supabase.ts`. Tables used: `analyses`, `trailers`, `search_log`, `feedback`. The schema is not in the repo.

**Styling**: Tailwind with a custom palette ("Ruhig", petrol + sand) defined in `tailwind.config.ts`: `brand`, `accent`, `ink`, `surface`, a tinted `gray` scale, and the rating colors `good`/`caution`/`bad`. Keep green/yellow/red for the traffic-light rating only; use `*-text` variants for text on light backgrounds (the base tones are too light for AA contrast) and `brand` for ordinary actions. Don't use raw Tailwind colors like `indigo-600` or `blue-500`.

## Gotchas

- `next build` prints a non-fatal `localStorage is not defined` error while prerendering `/favorites`, because `getAnalyses()` is called during render instead of in an effect. The build still succeeds.
- The README is partly outdated (describes the v1 single-route layout and only `ANTHROPIC_API_KEY`).
