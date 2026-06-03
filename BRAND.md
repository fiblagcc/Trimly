# Trimly, brand and color scheme (for the mobile app)

Match this so the mobile app feels like the same product as the web and desktop clients.
All three share the same Supabase backend, so use the same project URL + anon key and the
data, auth, and RLS line up automatically. This file is about the look.

## Core colors (exact hex)

| Role | Hex | Where it is used |
|------|-----|------------------|
| Primary (teal) | `#1D9E75` | buttons, links, active state, primary fills |
| Primary dark (deep teal) | `#0F6E56` | the LOGO color, large headings on light, button hover/pressed |
| Accent (amber) | `#FAC775` | ONE deliberate accent per screen (a key CTA, a highlight). Use sparingly. |
| Sand (background) | `#F1EFE8` | the app body / page background |
| Surface (card) | `#FFFFFF` | cards and input fields sit on the sand |
| Ink (text) | `#1A1A1A` | headings and body text on light surfaces |
| Ink muted (secondary text) | `#5B5A55` | secondary/subtext, captions (passes WCAG AA on sand) |
| Dark anchor | `#0A2620` | the ONE dark surface per screen (a top bar, a nav drawer, a footer band). Text on it is white. |

### Status / badge colors

| State | Background | Text |
|-------|-----------|------|
| Active / Live / Confirmed / Booked | `#E1F5EE` | `#0F6E56` |
| Pending | `#FAEEDA` | `#854F0B` |
| Inactive / Cancelled | `#E7E4DC` | `#5F5E5A` |
| Error | `#FEE2E2` (or transparent) | `#B91C1C` |

## Logo

- The logo is an SVG wordmark ("Trimly"). **Recolor its fill to `#0F6E56`** (the primary
  dark teal) on light backgrounds, and to `#FFFFFF` on the dark anchor surface. Do not
  recolor it to the brighter `#1D9E75`.
- App icon: the square monogram is the "T" glyph in white on a `#0F6E56` rounded square.

## Typography

- **Display / headings:** Fraunces (Google Fonts), weight 600. Used big for screen titles
  and hero text.
- **Body / UI / labels / numbers:** Inter (Google Fonts).
- Two families only. Headings are Fraunces 600; everything else is Inter.
- Mobile sizes (sp): screen title 28 to 34, section heading 18 to 20, body 16, label/caption
  12 to 13. Labels can be uppercase with slight letter spacing, used sparingly.
- On Android you can pull both from Google Fonts (downloadable fonts) by family name
  "Fraunces" and "Inter".

## Shape, elevation, spacing

- **Cards have NO shadow.** Use a 1px hairline border at about 8% ink (`#1A1A1A` at ~0.08
  alpha) on white. The sand background + the border do the lifting, not elevation.
- Corner radius: cards 16 to 20dp, buttons 12dp, inputs 10 to 12dp, pills/badges fully
  rounded or 6dp.
- Inputs: white fill, 1px border at ~15% ink (`#1A1A1A` ~0.15 alpha), border turns
  `#1D9E75` on focus.
- Spacing on a 4/8 grid, generous. Let screens breathe.

## Brand rules (the "feel")

- **No gradients.** Flat brand colors only.
- **Amber is rare.** One amber moment per screen, never as a general accent.
- **One dark surface per screen** (`#0A2620`) for weight, not more.
- Big Fraunces headings against calm Inter body is the signature contrast.
- No fake stats, ratings, or testimonials.
- If you use photos, give them a subtle teal/dark overlay so they read as art directed.

## Jetpack Compose (Material 3) mapping

```kotlin
import androidx.compose.ui.graphics.Color

object TrimlyColors {
    val Primary      = Color(0xFF1D9E75)
    val PrimaryDark  = Color(0xFF0F6E56) // logo + large headings
    val Accent       = Color(0xFFFAC775) // amber, sparingly
    val Sand         = Color(0xFFF1EFE8) // background
    val Surface      = Color(0xFFFFFFFF) // cards
    val Ink          = Color(0xFF1A1A1A) // text
    val InkMuted     = Color(0xFF5B5A55) // secondary text
    val DarkAnchor   = Color(0xFF0A2620) // one dark surface per screen
    val Outline      = Color(0x141A1A1A) // ~8% ink hairline border
    val Error        = Color(0xFFB91C1C)
    val ActiveBg     = Color(0xFFE1F5EE)
    val ActiveText   = Color(0xFF0F6E56)
    val PendingBg    = Color(0xFFFAEEDA)
    val PendingText  = Color(0xFF854F0B)
}

val TrimlyLightScheme = androidx.compose.material3.lightColorScheme(
    primary           = TrimlyColors.Primary,
    onPrimary         = Color.White,
    primaryContainer  = TrimlyColors.ActiveBg,
    onPrimaryContainer= TrimlyColors.ActiveText,
    secondary         = TrimlyColors.Accent,   // amber accent
    onSecondary       = TrimlyColors.Ink,
    background        = TrimlyColors.Sand,
    onBackground      = TrimlyColors.Ink,
    surface           = TrimlyColors.Surface,
    onSurface         = TrimlyColors.Ink,
    onSurfaceVariant  = TrimlyColors.InkMuted,
    outline           = TrimlyColors.Outline,
    error             = TrimlyColors.Error,
    onError           = Color.White,
)
// Use TrimlyColors.DarkAnchor as a custom color for the one dark surface per screen
// (top bar / nav), with white or teal-light text on it. Material 3 has no slot for it.
```

(iOS / SwiftUI or React Native: use the same hex values and roles from the table above.)
