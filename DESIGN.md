# Design

## Theme

Warm editorial. A sand page background with warm-white cards lifting off it, deep teal as
the brand and primary action color, and a single deep teal-black surface as the dark anchor
per layout (barber sidebar, landing for-barbers band, footer). No gradients.

## Color

Defined as Tailwind v4 `@theme` tokens in `src/index.css` (never hard-coded in components):

| Token | Value | Role |
|-------|-------|------|
| `--color-primary` | `#1D9E75` | fills, buttons, links |
| `--color-primary-dark` | `#0F6E56` | large teal type, hover, the logo |
| `--color-accent` | `#FAC775` | one deliberate amber moment per screen |
| `--color-sand` | `#F1EFE8` | page background |
| `--color-ink` | `#1A1A1A` | display headings, body |
| `--color-dark-anchor` | `#0A2620` | the one dark surface per layout |
| `--color-ink-muted` | `#5B5A55` | secondary text (AA-safe on sand) |

Badge palettes (active / pending / inactive) are tokenized too. Strategy: Restrained on
product surfaces, one saturated dark anchor on the landing.

## Typography

- **Display / headings:** Fraunces (variable, optical sizing), weight 600.
- **Body / UI:** Inter.
- Loaded via Google Fonts `<link>` in `index.html`. Two families, committed weight contrast.
- Hero `clamp(2.5rem, 5vw, 4.5rem)`, line-height ~1.05, letter-spacing -0.02em. Body 16px.
- Numbers in metrics use the display face with tabular figures.
- These two families are the committed brand identity; do not swap them.

## Components

Hand-built on Tailwind in `src/components/ui/` (button, card, input, label, badge, dialog,
tabs, table, select, skeleton, avatar). The signature element is the **editorial card**:
warm white, radius ~1.25rem, 1px hairline border at ~8% ink, generous padding, no drop
shadow, quiet hover (border darkens). Loading uses card-shaped skeletons, not spinners.

## Layout

12-column feel, max content width 1200px, generous section padding. Asymmetric hero on the
landing (text left, image right). Dashboards use a real hierarchy: large display page title,
small functional section labels.

## Motion

150 to 250ms transitions. Buttons scale slightly on press. Cards lift quietly on hover. One
gentle fade-up as landing sections enter view, fired once. Everything has a
`prefers-reduced-motion` fallback.

## Logo

`<TrimlyLogo />` renders the genuine Trimly wordmark as inline SVG (paths exported from the
brand file), recolored via the teal token so it can flip white on the dark anchor.
`<TrimlyMark />` is the square monogram for the favicon and tight spots. Fixed sizes, never
free-resized.
