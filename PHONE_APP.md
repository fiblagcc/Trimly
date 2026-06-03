# Trimly phone app (this branch)

This branch, `trimly-phone-app`, is the workspace for the Trimly **mobile app**
(Android / Kotlin). The web app lives on `main`. Keep the two separate.

## Rules

- **Never merge this branch into `main`.** It is a standing parallel branch, not a
  feature branch to merge. The phone app and the web app are different codebases.
- To pick up brand or backend changes the web team makes, merge the other direction
  (`git merge main` while on this branch), never `trimly-phone-app` into `main`.
- **Vercel does not build this branch.** `vercel.json` sets
  `git.deploymentEnabled.trimly-phone-app = false`, so the production website (deployed
  only from `main`) is never touched by phone-app commits. Leave that setting in place.

## Shared backend (same as web + desktop)

- Supabase project `madsedhycdiattoaypyl` (`https://madsedhycdiattoaypyl.supabase.co`).
  Use the same anon key the web app uses (ask the web team; it is not committed).
- Schema + Row Level Security live in `supabase/migrations/`. Seed data in `supabase/seed.sql`.
- Booking goes through the `book_slot` RPC. Core tables: `profiles`, `barbershops`,
  `availability_slots`, `appointments`, `tickets`. Search = active shops filtered by ZIP.
- Demo accounts (password `trimly123`): `client@`, `barber@`, `admin@trimly.demo`.

## Brand

- Colors, typography, and a ready-to-use Jetpack Compose color scheme: `BRAND.md`.
- App icon (use the **full-bleed** version on phone): `brand-assets/`.

## Suggested layout

- Put the Android project in its own subfolder (e.g. `android/`) so the web code on this
  branch stays a clean reference and diffs stay readable.

## Workflow

- The phone team pushes their code here. The web team can pull this branch, help, and
  push back. Both sides read each other's diffs to stay in sync.
