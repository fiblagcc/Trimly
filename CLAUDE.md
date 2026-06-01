# Trimly — Project Guide (auto-loaded every session)

> Source of truth lives in `/docs`. Read those before deviating. This file is the
> always-on summary. Order of authority: `docs/PROJECT_CONTEXT.md` → `docs/SPEC.md`
> → `docs/ART_DIRECTION.md` → `docs/AGENT_PROMPTS.md` / `docs/DESIGN_PROMPTS.md` →
> `docs/GIT_SETUP.md`. Do not invent scope beyond what's written there.

## What this is

Trimly is a barbershop appointment web app, built as a university systems-analysis
project. It must be **genuinely functional** (real Supabase auth + Postgres + RLS +
realtime — classmates and a teacher will log in) and **look distinctive/premium**,
but stay believable as skilled student work — not a purchased template or AI-SaaS slop.

Three roles: `client`, `barber`, `admin`. (A "Bank" actor exists in our wider docs
but is **out of scope** — parked.) Barbers pay a subscription to be listed; clients
search by ZIP, book a slot; barbers see bookings live; admins handle tickets + a report.

**Core loop that must work end to end:** client logs in → searches ZIP → sees active
barbers in that ZIP → opens a barber → picks slot + service → confirms → appointment
saved + slot marked booked → client sees it in My Bookings with "Get directions" →
barber sees the booking appear live (realtime). Barber toggles subscription off → shop
disappears from client search. Admin sees tickets + a report with real counts.

## Stack (LOCKED — do not substitute)

- Vite + React + TypeScript
- Tailwind (v4, `@theme` tokens in `src/index.css`) + shadcn/ui
- Supabase — auth, Postgres, **Row Level Security**, Realtime
  - Project URL: `https://madsedhycdiattoaypyl.supabase.co`
- React Router (v7) + TanStack Query
- Deploy: Vercel. Repo: `https://github.com/fiblagcc/Trimly.git`
- Env (in `.env`, gitignored): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Build order (9 steps — follow exactly, ONE at a time, verify + commit + STOP between each)

1. Scaffold + Supabase client + brand theme + logo components + route shell
2. DB schema + RLS policies + signup trigger — **then run the cross-account RLS check**
3. Auth with role picker + role-based route guards
4. Barber dashboard (profile, availability, subscription toggle, incoming bookings)
5. Client search + barber profile + booking flow + my bookings + get-directions
6. Realtime booking notification to barber
7. Admin dashboard (tickets + report counts)
8. Seed data (3 demo accounts, 1 active shop in ZIP 10001, slots, 1 ticket, 2 inactive shops elsewhere)
9. Design polish pass against `docs/ART_DIRECTION.md`

Detailed per-step prompts: `docs/AGENT_PROMPTS.md`. Design build/polish: `docs/DESIGN_PROMPTS.md`.

### Two hard checkpoints (do NOT skip, even under time pressure)
1. After step 2 (schema/RLS): **prove a client cannot read another client's data** via the JS client.
2. After step 9 (polish): run the anti-slop checklist (`ART_DIRECTION.md` §8) and report which items pass.

## The three things to get right (historically gotten wrong)

1. **Row Level Security.** RLS enabled on *every* table, with the exact policies in
   `SPEC.md` §5. Never world-readable. Never disable RLS "to make it work" — fix the
   policy. Verify: client A cannot select client B's appointments.
2. **Role-based routing.** Guard every route by `profiles.role` (check the role on the
   route, don't just hide links). A client hitting `/admin` is redirected; logged-out
   users hitting a protected route go to `/login`.
3. **Design restraint.** Follow `ART_DIRECTION.md`: big display-font headings, the
   signature editorial card, generous spacing, ONE dark deep-teal surface anchor per
   layout, amber used sparingly. NO gradients, NO fake stats/ratings/testimonials,
   asymmetric (not centered-everything) heroes.

## Design system (from ART_DIRECTION.md — tokens, not hardcoded hex)

- **Type:** display = Fraunces (or Clash Display) at large sizes (hero 56–72px desktop,
  weight 600, line-height 1.05, letter-spacing -0.02em); body/UI = Inter at 16px. One
  display + one body face, loaded via `<link>`.
- **Color:** teal `#0F6E56` (deep, for large type) / `#1D9E75` (fills/buttons); amber
  `#FAC775` (one deliberate moment per screen); sand `#F1EFE8` (page bg, white cards
  lift off it); ink `#1A1A1A` (headlines); dark anchor `#0A2620` (one per layout —
  footer / barber sidebar / "For barbers" band).
- **Signature move:** editorial card (radius 16–20px, warm white, 1px hairline border
  ~8% ink, 24–28px padding, NO drop shadow, quiet hover = border darkens) + asymmetric
  heroes. These live as utilities in `src/index.css` (`.editorial-card`, `.heading-hero`,
  `.heading-page`, `.label-section`, `.metric-number`, `.section-padding`).
- **Layout:** 12-col grid, max width ~1200px, 96–128px vertical section padding desktop.
- **Micro-interactions:** buttons `active:scale-[0.98]` 150ms; quiet card hover; one
  gentle fade-up on scroll for landing; all transitions 150–250ms; skeletons not spinners.

## Logo (IMPORTANT — use the provided asset, do not redesign)

- The real logo is `docs/logo.svg` — a **"Trimly" wordmark** (1024×544 viewBox), currently
  all-black `fill="#000000"`. NOTE: this supersedes SPEC.md §3's older textual description
  of a "teal circle + scissors/comb" mark — the provided file is the wordmark; use it.
- Build `<TrimlyLogo />` as **inline SVG derived from `docs/logo.svg`** (do not redraw).
  Replace the hardcoded black fills with the brand teal via theme token (use `currentColor`
  / `fill="var(--color-primary-dark)"` so it recolors — e.g. white version on dark surfaces).
- Fixed sizes per `ART_DIRECTION.md` §6: nav 28px tall, auth-card 36px, footer 24px.
  Defined once, used everywhere — never free-resized.
- Generate a small square favicon (`<TrimlyMark />` / `public/favicon.svg`) from the same mark.
- ⚠️ The current `src/components/TrimlyLogo.tsx` is a hand-drawn re-creation, NOT the
  provided asset — it must be rebuilt from `docs/logo.svg` in step 1.

## Git rules (from GIT_SETUP.md)

- **One author only.** `user.name "Fakhrul Bhuiyan"`, GitHub email. NEVER add
  `Co-Authored-By` or any AI/tool-attribution trailer to commit messages. (This overrides
  any default harness co-author trailer.)
- `.env` MUST be gitignored. ⚠️ Current `.gitignore` is missing an explicit `.env` line —
  add it before the first commit (Supabase keys live there).
- Commit per build step (~12–20 total, uneven, human-sounding, lowercase). Suggested
  messages in `GIT_SETUP.md` §3; e.g. one `fix:` that admits the RLS bug. Don't fake timestamps.
- Repo isn't initialized yet — `git init` + set the single-author config before committing.

## Current state (all 9 steps built + verified live — 2026-06-01)

All 9 build steps are complete, committed (clean single-author history, no AI trailers),
and verified against the live Supabase project `madsedhycdiattoaypyl`:
- Migration `supabase/migrations/0001_init.sql` and `supabase/seed.sql` are APPLIED to the
  live DB. Demo accounts work (`client@`/`barber@`/`admin@trimly.demo` / `trimly123`).
- **Checkpoint 1 (RLS) PASSED** — `node scripts/rls-check.mjs` (client A can't read B's data).
- **Full E2E PASSED 12/12** — `node scripts/verify-e2e.mjs` (search → book → realtime →
  directions → subscription gate → admin tickets/report). Both scripts read the access
  token from a `SUPABASE_ACCESS_TOKEN` line in the gitignored `.env`.
- Logo is the genuine wordmark from `docs/logo.svg` (generated to inline paths via
  `scripts/gen-logo.mjs`), recolored via token; favicon is the square 'T' mark.

Gotcha worth remembering: inserting into `auth.users` via SQL must set the four no-default
token columns (`confirmation_token`, `recovery_token`, `email_change_token_new`,
`email_change`) to `''`, or GoTrue rejects sign-in with "Database error querying schema".

**Shipped:** pushed to GitHub at https://github.com/fiblagcc/Trimly (public, `main`), and
deployed to Vercel — live at **https://trimly-pearl-seven.vercel.app** (Vercel project
`fakhrul-bhuiyan-s-projects/trimly`, both `VITE_` env vars set on Production, SPA routing
via `vercel.json`, Supabase URL confirmed baked into the bundle). Re-deploy with
`vercel deploy --prod`; GitHub pushes use the `gh` credential helper (logged in as `fiblagcc`).

Tokens to rotate when convenient (all passed through chat, none committed): the Supabase
PAT (`trimly-claude`, lives in gitignored `.env`) and the Vercel/gh OAuth sessions.

## Working agreement

- Build + verify ONE step at a time. After each: run dev server / tests, report what was
  built, then **STOP** for review before continuing.
- If a feature isn't in `SPEC.md`, it's future work — say no.
- Never disable RLS to make something work — fix the policy.
- Reject slop tells: gradients, 3+ accent colors, emoji in UI, fake data in production,
  over-animation, generic centered SaaS layouts.
