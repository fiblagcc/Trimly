# Trimly

A barbershop appointment app. The idea is simple: barbers subscribe to get listed,
clients search by ZIP code and book an appointment, and the barber is notified the moment
a booking comes in.

Three kinds of users:

- **Client.** Search for barbers in their area, book a slot, and get directions on the day
  of the appointment.
- **Barber.** Set up a shop, manage availability, and watch bookings arrive. Trimly only
  charges barbers, so there is a subscription toggle that controls whether the shop is
  listed.
- **Admin.** Handle support tickets and pull a quick report on how the platform is doing.

## Live demo

The app is deployed at **https://trimly-pearl-seven.vercel.app**. Sign in with the client
account below and search ZIP `10001` to see the full booking flow.

## Stack

- Vite + React + TypeScript
- Tailwind with hand-built components (button, card, dialog, tabs, table, and the rest)
- Supabase for auth, Postgres, Row Level Security, and Realtime
- React Router and TanStack Query
- Hosted on Vercel

Supabase handles auth and the database in one place, and Row Level Security keeps each
user's data private without a separate backend. React and Vite are fast to work in, and
Tailwind kept the styling consistent without a lot of CSS overhead.

## Running it locally

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your Supabase URL and anon key.
3. `npm run dev`

### Setting up the database

The schema, the Row Level Security policies, the signup trigger, and the booking function
all live in `supabase/migrations/0001_init.sql`. The demo data is in `supabase/seed.sql`.

The easiest way to run them is in the Supabase dashboard SQL editor (paste each file and
run). With a [Supabase access token](https://supabase.com/dashboard/account/tokens) set,
you can also apply them from the command line:

```bash
# PowerShell
$env:SUPABASE_ACCESS_TOKEN = "sbp_..."
node scripts/db-apply.mjs supabase/migrations/0001_init.sql
node scripts/db-apply.mjs supabase/seed.sql
```

There is also a check that proves the RLS works, that one client cannot read another
client's data:

```bash
node scripts/rls-check.mjs
```

And an end-to-end check that walks the whole booking loop against the live database:

```bash
node scripts/verify-e2e.mjs
```

## Demo accounts

These passwords are for the demo only.

- Client: `client@trimly.demo` / `trimly123`
- Barber: `barber@trimly.demo` / `trimly123`
- Admin: `admin@trimly.demo` / `trimly123`

Search ZIP `10001` as the client to find the seeded barber (Fade & Co.).

## Deploying

It is a static Vite build, so Vercel needs:

- Build command `npm run build`, output directory `dist`
- The two env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). The Supabase Vercel
  integration can inject these for you.

`vercel.json` rewrites all routes to `index.html` so client-side routing works on refresh.

## What works and what is next

Working today: signup and login with roles, ZIP search, booking with a live notification
to the barber, get-directions, the subscription toggle, and the admin tickets and report.

Next up:

- **Real subscription billing.** The subscription is a toggle right now, with a note in the
  code (`src/lib/barber.ts`) marking where Stripe Checkout would hook in.
- **A barber notification app.** The web version uses a realtime in-app toast; a push
  notification on mobile would be the fuller version.
- **Distance-based search.** Search matches ZIP exactly today, but every shop stores
  coordinates, so a radius search is a query change away.

## Known limitations

- Booking is race-safe (a Postgres function locks the slot row so two people cannot grab
  the same time), but it does not try to handle every concurrent edge case beyond that.
- Availability is managed as individual slots rather than recurring weekly hours, which
  would be the nicer version.
- Client-side cancelling is not built yet. The data model supports it; the core booking
  loop came first.
