# Trimly

A barbershop appointment app. Barbers subscribe to get listed, clients search by ZIP code
and book a slot, and the barber is notified the moment a booking comes in.

---

> **You are on the `trimly-phone-app` branch — the Android client.**
> The web app lives on [`main`](../../tree/main).
> These two branches share the same Supabase backend but are separate codebases.
> This branch is never merged into `main`.

---

## What Trimly does

Three kinds of users:

- **Client.** Search for barbers nearby, pick a slot, and get directions on the day of
  the appointment.
- **Barber.** Set up a shop, manage availability, and watch bookings arrive live. A
  subscription toggle controls whether the shop is listed.
- **Admin.** Handle support tickets and pull a quick report on how the platform is doing.

## Clients (two separate apps, one backend)

| Client | Branch | Tech | Live |
|--------|--------|------|------|
| Web app | `main` | React + TypeScript + Vite | [beta-trimly.vercel.app](https://beta-trimly.vercel.app) |
| Android app | `trimly-phone-app` ← you are here | Kotlin + Android SDK 36 | — |

## Android app

The Android app is in the `android/` folder. See [`android/README.md`](android/README.md)
for build instructions.

### Screens

| Screen | File |
|--------|------|
| Splash | `SplashActivity.kt` |
| Onboarding | `OnboardingActivity.kt` |
| Login | `MainActivity.kt` |
| Register | `RegisterActivity.kt` |
| Home (shop search + categories) | `HomeActivity.kt` |
| Barbershop detail | `BarbershopActivity.kt` |
| Booking (slot picker) | `BookingActivity.kt` |
| Checkout (confirm + pay) | `CheckoutActivity.kt` |
| My bookings | `BookingsActivity.kt` |
| Favorites | `FavoritesActivity.kt` |
| Notifications | `NotificationsActivity.kt` |
| Profile | `ProfileActivity.kt` |

### Tech stack

- **Language:** Kotlin
- **UI:** Android Views + Material Design 3 (`com.google.android.material:material:1.11.0`)
- **Auth + DB:** Supabase Kotlin SDK v3 (`auth-kt`, `postgrest-kt`)
- **Min SDK:** 24 (Android 7.0), **Target SDK:** 36
- **Splash:** AndroidX SplashScreen API

## Shared backend

Both clients talk to the same Supabase project (`madsedhycdiattoaypyl`). The schema,
Row Level Security policies, and seed data live in:

- `supabase/migrations/0001_init.sql` — schema + RLS + triggers
- `supabase/seed.sql` — demo accounts and a seeded shop in ZIP 10001

Booking goes through the `book_slot` RPC. Core tables: `profiles`, `barbershops`,
`availability_slots`, `appointments`, `tickets`.

## Demo accounts

Password for all three: `trimly123`

| Role | Email |
|------|-------|
| Client | `client@trimly.demo` |
| Barber | `barber@trimly.demo` |
| Admin | `admin@trimly.demo` |

Search ZIP `10001` as the client to find the seeded shop (Fade & Co.).

## Brand

Colors, typography, and spacing guidelines for the Android app are in
[`BRAND.md`](BRAND.md). The app icon assets are in [`brand-assets/`](brand-assets/).

## What is next

- Push notifications when a new booking arrives (the web app uses an in-app realtime
  toast; mobile should get a push).
- Distance-based search — every shop stores coordinates, so a radius query is a small
  change.
- Client-side booking cancellation — the data model supports it, the UI is not built yet.
