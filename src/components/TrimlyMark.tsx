import type { FC } from 'react'
import { TRIMLY_PATHS } from './trimly-logo-paths'

// The square monogram — the 'T' glyph from the wordmark, white on the brand teal.
// Used for the favicon, mobile nav, and any tight spot per ART_DIRECTION §6.
// Path index 1 in the wordmark is the stylized 'T' (razor stem + comb crossbar).
const T_PATH = TRIMLY_PATHS[1]

// Frame the glyph in a 64×64 square (computed once at module load, not per render).
const { tx, ty, scale } = (() => {
  const nums = (T_PATH.match(/-?\d+\.?\d*/g) || []).map(Number)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i], y = nums[i + 1]
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  const bw = maxX - minX, bh = maxY - minY
  const pad = 9, inner = 64 - pad * 2
  const s = Math.min(inner / bw, inner / bh)
  return {
    scale: s,
    tx: (64 - bw * s) / 2 - minX * s,
    ty: (64 - bh * s) / 2 - minY * s,
  }
})()

interface TrimlyMarkProps {
  size?: number
  className?: string
}

export const TrimlyMark: FC<TrimlyMarkProps> = ({ size = 32, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    role="img"
    aria-label="Trimly"
    className={className}
  >
    <rect width="64" height="64" rx="14" fill="var(--color-primary-dark, #0F6E56)" />
    <path transform={`translate(${tx} ${ty}) scale(${scale})`} fill="#FFFFFF" d={T_PATH} />
  </svg>
)
