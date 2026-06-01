# Trimly

A barbershop appointment system. Built for our systems analysis project — the idea
is simple: barbers subscribe to get listed, clients search by ZIP code and book an
appointment, and the barber gets notified.

Three types of users:

- **Client** — search for barbers in their area, book a slot, get directions on the
  day of the appointment.
- **Barber** — set up a shop, manage availability, and see bookings come in. We only
  charge barbers (subscription), so there's a toggle for that.
- **Admin** — handle support tickets and pull a quick report on how things are going.

## Stack

- Vite + React + TypeScript
- Tailwind + shadcn-style components (hand-built on top of Tailwind)
- Supabase for auth + database (Postgres) + realtime
- React Router + TanStack Query
- Deployed on Vercel

I went with Supabase because it handles auth and the database in one place, and the
row-level security meant I didn't have to write a separate backend just to keep each
user's data private. React + Vite is what I'm comfortable in, and Tailwind let me get
a clean, consistent look without spending the whole time fighting CSS.

## Running it locally

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your Supabase URL and anon key.
3. `npm run dev`

### Setting up the database

The schema, the row-level security policies, the signup trigger, and the booking
function all live in `supabase/migrations/0001_init.sql`. The demo data is in
`supabase/seed.sql`.

The easiest way to run them is in the Supabase dashboard SQL editor (paste each file
and run). Or, with a [Supabase access token](https://supabase.com/dashboard/account/tokens)
set, you can apply them from the command line:

```bash
# PowerShell
$env:SUPABASE_ACCESS_TOKEN = "sbp_..."
node scripts/db-apply.mjs supabase/migrations/0001_init.sql
node scripts/db-apply.mjs supabase/seed.sql
```

There's also a check that proves the RLS works — that one client can't read another
client's data:

```bash
node scripts/rls-check.mjs
```

## Demo accounts

(Demo only — these passwords are not for anything real.)

- Client: `client@trimly.demo` / `trimly123`
- Barber: `barber@trimly.demo` / `trimly123`
- Admin: `admin@trimly.demo` / `trimly123`

Try searching ZIP `10001` as the client to see the seeded barber (Fade & Co.).

## Deploying

It's a static Vite build, so Vercel just needs:

- Build command `npm run build`, output `dist`
- The two env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) — the Supabase
  Vercel integration can inject these automatically.

`vercel.json` rewrites all routes to `index.html` so the client-side routing works on
refresh.

## What's done vs. what's next

Working: signup/login with roles, ZIP search, booking with a live notification to the
barber, get-directions, the subscription toggle, admin tickets and report.

Not done yet (would be the next phase):

- **Real payment / subscription billing.** Right now the subscription is just a toggle
  — there's a note in the code (`src/lib/barber.ts`) where the Stripe integration would
  go. Our project docs treat the bank as a later concern and we kept it that way.
- **A proper barber notification app.** For the web version the barber gets a realtime
  in-app toast; a push-notification mobile app would be the real version.
- **Distance-based search.** Right now it's an exact ZIP match, but I store coordinates
  on each shop, so adding a radius search later is just a query change.

## Known limitations

- The booking is race-safe (a Postgres function locks the slot row, so two people can't
  grab the same time), but it doesn't try to handle every concurrent edge case beyond that.
- Availability is managed as individual slots rather than recurring weekly hours, which
  would be the nicer version.
- Cancelling isn't built on the client side yet — the data model supports it, but I
  focused on getting the core booking loop solid first.
