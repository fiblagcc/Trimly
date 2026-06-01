// Extracts the exact path data from docs/logo.svg (the real Trimly wordmark) so the
// React logo component renders the genuine mark, never a redrawn approximation.
// Outputs:
//   src/components/trimly-logo-paths.ts  (exact path 'd' strings + a TIGHT viewBox)
//   public/favicon.svg                   (square mark: the 'T' glyph, white on brand teal)
//
// The original file's viewBox (0 0 1024 544) has large empty margins around the
// glyphs, so rendering at a given height produced letters far smaller than that
// height. We compute a tight bounding box over the actual paths and use that as the
// viewBox, so the wordmark fills the box it is given.
import { readFileSync, writeFileSync } from 'node:fs'

const svg = readFileSync('docs/logo.svg', 'utf8')

// all path d= strings, in document order (left-to-right glyphs of "Trimly")
const ds = [...svg.matchAll(/<path[^>]*\sd="([\s\S]*?)"/g)].map((m) =>
  m[1].replace(/\s+/g, ' ').trim()
)
if (ds.length === 0) throw new Error('no paths found in logo.svg')

// Crude bbox from coordinate pairs (control points included, so the frame is a hair
// generous; that reads as a touch of breathing room, never a clip).
function bbox(d) {
  const nums = [...d.matchAll(/-?\d+\.?\d*/g)].map(Number)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i], y = nums[i + 1]
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY }
}

// Union bbox across every glyph -> the tight viewBox for the full wordmark.
const all = ds.map(bbox)
const minX = Math.min(...all.map((b) => b.minX))
const minY = Math.min(...all.map((b) => b.minY))
const maxX = Math.max(...all.map((b) => b.maxX))
const maxY = Math.max(...all.map((b) => b.maxY))
const r = (n) => Math.round(n * 100) / 100
const tightVB = `${r(minX)} ${r(minY)} ${r(maxX - minX)} ${r(maxY - minY)}`
console.log(`extracted ${ds.length} paths; tight viewBox="${tightVB}"`)

// --- write paths module ---
const tsBody =
  `// AUTO-GENERATED from docs/logo.svg by scripts/gen-logo.mjs - do not edit by hand.\n` +
  `// The genuine Trimly wordmark, exported as inline-SVG path data, framed tight.\n` +
  `export const TRIMLY_VIEWBOX = '${tightVB}'\n\n` +
  `export const TRIMLY_PATHS: string[] = [\n` +
  ds.map((d) => `  ${JSON.stringify(d)},`).join('\n') +
  `\n]\n`
writeFileSync('src/components/trimly-logo-paths.ts', tsBody)

// --- favicon: isolate the 'T' glyph (path index 1) and frame it in a square ---
const t = ds[1]
const b = bbox(t)
const pad = 9, inner = 64 - pad * 2
const scale = Math.min(inner / b.w, inner / b.h)
const tx = (64 - b.w * scale) / 2 - b.minX * scale
const ty = (64 - b.h * scale) / 2 - b.minY * scale
const fav =
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">\n` +
  `  <rect width="64" height="64" rx="14" fill="#0F6E56"/>\n` +
  `  <path transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(4)})" fill="#FFFFFF" d="${t}"/>\n` +
  `</svg>\n`
writeFileSync('public/favicon.svg', fav)
console.log('wrote src/components/trimly-logo-paths.ts and public/favicon.svg')
