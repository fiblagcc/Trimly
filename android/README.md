# Trimly Android App

This is the Android client for Trimly. It talks to the same Supabase backend as the
web app — same accounts, same data, same Row Level Security.

## Requirements

- **Android Studio** Meerkat (2024.3) or newer
- **JDK 11**
- Android SDK with API 36 installed (via SDK Manager)

## Building

1. Clone or pull the `trimly-phone-app` branch.
2. Open the `android/` folder in Android Studio (`File → Open`, select the `android/` directory).
3. Copy your Supabase credentials into `android/app/src/main/java/com/example/trimly/SupabaseClient.kt`:

```kotlin
val client = createSupabaseClient(
    supabaseUrl = "https://madsedhycdiattoaypyl.supabase.co",
    supabaseKey = "YOUR_ANON_KEY"
) { ... }
```

4. Run on an emulator or device: **Run → Run 'app'** (or `Shift + F10`).

> The anon key is in the project `.env` file (gitignored). Ask the web team or get it
> from the [Supabase dashboard](https://supabase.com/dashboard/project/madsedhycdiattoaypyl/settings/api).

## Project structure

```
android/
├── app/
│   └── src/main/java/com/example/trimly/
│       ├── SupabaseClient.kt       # Supabase singleton (URL + anon key here)
│       ├── MainActivity.kt         # Login screen
│       ├── RegisterActivity.kt     # Sign-up screen
│       ├── SplashActivity.kt       # Splash (AndroidX SplashScreen API)
│       ├── OnboardingActivity.kt   # First-launch onboarding
│       ├── HomeActivity.kt         # Shop search + category filter
│       ├── BarbershopActivity.kt   # Shop detail (services, slots)
│       ├── BookingActivity.kt      # Slot picker
│       ├── CheckoutActivity.kt     # Booking confirmation
│       ├── BookingsActivity.kt     # My bookings list
│       ├── FavoritesActivity.kt    # Saved shops
│       ├── NotificationsActivity.kt
│       └── ProfileActivity.kt
├── build.gradle.kts
└── settings.gradle.kts
```

## Key dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| Supabase BOM | 3.1.4 | Auth + Postgres |
| Ktor Android client | 3.1.3 | HTTP (required by Supabase SDK) |
| Material Design 3 | 1.11.0 | UI components |
| AndroidX SplashScreen | 1.0.1 | Splash screen |
| kotlinx-serialization-json | 1.6.3 | JSON parsing |

## Demo accounts

| Role | Email | Password |
|------|-------|---------|
| Client | `client@trimly.demo` | `trimly123` |
| Barber | `barber@trimly.demo` | `trimly123` |
| Admin | `admin@trimly.demo` | `trimly123` |

Search ZIP `10001` after signing in as client to find the seeded barbershop (Fade & Co.).

## Brand guidelines

See [`../BRAND.md`](../BRAND.md) for the full color palette, typography specs (Fraunces +
Inter), spacing rules, and the card/button style the Android app should match.
