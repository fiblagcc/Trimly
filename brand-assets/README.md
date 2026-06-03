# Trimly app icon

The Trimly mark: a barber's straight razor in white on the brand deep teal
(`#0F6E56`). Same icon the desktop app uses for its window and taskbar. Use it for
the mobile app icon so all three platforms match.

## Files

| File | Shape | Use it for |
|------|-------|------------|
| `trimly-app-icon.svg` | rounded square (vector) | scalable master, web, anywhere a finished rounded icon fits |
| `trimly-app-icon-1024.png` | rounded square, 1024x1024 | drop-in rounded icon |
| `trimly-app-icon-fullbleed.svg` | full square (vector) | master for phone icons where the OS rounds it itself |
| `trimly-app-icon-fullbleed-1024.png` | full square, 1024x1024 | iOS App Store icon, Android adaptive icon |

## Mobile notes

- **iOS:** use the full-bleed 1024 PNG. iOS applies its own rounded mask and rejects
  any transparency, so do not pre-round it. The full-bleed file is fully opaque.
- **Android (adaptive icon):** use the full-bleed art. Simplest path is to set the
  background to a solid `#0F6E56` layer and the razor as the white foreground, or import
  `trimly-app-icon-fullbleed.svg` as a Vector Asset. The razor sits inside the safe zone.
- **Android (legacy / Play Store listing):** the rounded 1024 PNG works as-is.
- Prefer the SVGs when your toolchain accepts vectors; they stay crisp at every density.

## Color

- Background teal: `#0F6E56`
- Mark: `#FFFFFF`

Full palette and typography are in `../BRAND.md`.
