import type { FC } from 'react'
import { TRIMLY_PATHS, TRIMLY_VIEWBOX } from './trimly-logo-paths'

// Fixed sizes per ART_DIRECTION §6 - the logo is never free-resized.
const HEIGHTS = { nav: 38, auth: 50, footer: 32 } as const
const [, , VB_W, VB_H] = TRIMLY_VIEWBOX.split(' ').map(Number)
const ASPECT = VB_W / VB_H

interface TrimlyLogoProps {
  size?: keyof typeof HEIGHTS
  /** 'brand' → deep teal (default, for light surfaces); 'light' → white (for the dark anchor) */
  tone?: 'brand' | 'light'
  className?: string
}

/**
 * The genuine Trimly wordmark, rendered as inline SVG (crisp at every size,
 * recolorable, no PNG fuzz). Paths are exported verbatim from docs/logo.svg by
 * scripts/gen-logo.mjs - this component never redraws the mark. The original
 * black fills are swapped to `currentColor` so the color comes from the theme
 * token, letting it flip to white on the dark surface.
 */
export const TrimlyLogo: FC<TrimlyLogoProps> = ({ size = 'nav', tone = 'brand', className }) => {
  const h = HEIGHTS[size]
  const w = Math.round(h * ASPECT)
  const color = tone === 'light' ? '#FFFFFF' : 'var(--color-primary-dark)'

  return (
    <svg
      width={w}
      height={h}
      viewBox={TRIMLY_VIEWBOX}
      role="img"
      aria-label="Trimly"
      className={className}
      style={{ color }}
    >
      {TRIMLY_PATHS.map((d, i) => (
        <path key={i} d={d} fill="currentColor" />
      ))}
    </svg>
  )
}
