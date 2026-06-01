// Extracts the exact path data from docs/logo.svg (the real Trimly wordmark) so the
// React logo component renders the genuine mark - never a redrawn approximation.
// Outputs:
//   src/components/trimly-logo-paths.ts  (exact path 'd' strings, fill swapped to currentColor)
//   public/favicon.svg                   (square mark: the 'T' glyph, white on brand teal)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const svg = readFileSync('docs/logo.svg', 'utf8')

// viewBox
const vb = (svg.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 1024 544'

// all path d= strings, in document order (left-to-right glyphs of "Trimly")
const ds = [...svg.matchAll(/<path[^>]*\sd="([\s\S]*?)"/g)].map(m =>
  m[1].replace(/\s+/g, ' ').trim()
)
if (ds.length === 0) throw new Error('no paths found in logo.svg')
console.log(`extracted ${ds.length} paths; viewBox="${vb}"`)

// --- write paths module ---
const tsBody =
  `// AUTO-GENERATED from docs/logo.svg by scripts/gen-logo.mjs - do not edit by hand.\n` +
  `// The genuine Trimly wordmark, exported as inline-SVG path data.\n` +
  `export const TRIMLY_VIEWBOX = '${vb}'\n\n` +
  `export const TRIMLY_PATHS: string[] = [\n` +
  ds.map(d => `  ${JSON.stringify(d)},`).join('\n') +
  `\n]\n`
writeFileSync('src/components/trimly-logo-paths.ts', tsBody)

// --- favicon: isolate the 'T' glyph (path index 1) and frame it in a square ---
const t = ds[1]
const nums = [...t.matchAll(/-?\d+\.?\d*/g)].map(Number)
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
// crude bbox from coordinate pairs (control points included → slightly generous frame; fine for a favicon)
for (let i = 0; i + 1 < nums.length; i += 2) {
  const x = nums[i], y = nums[i + 1]
  if (x < minX) minX = x; if (x > maxX) maxX = x
  if (y < minY) minY = y; if (y > maxY) maxY = y
}
const bw = maxX - minX, bh = maxY - minY
const pad = 9, inner = 64 - pad * 2
const scale = Math.min(inner / bw, inner / bh)
const tx = (64 - bw * scale) / 2 - minX * scale
const ty = (64 - bh * scale) / 2 - minY * scale
const fav =
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">\n` +
  `  <rect width="64" height="64" rx="14" fill="#0F6E56"/>\n` +
  `  <path transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(4)})" fill="#FFFFFF" d="${t}"/>\n` +
  `</svg>\n`
writeFileSync('public/favicon.svg', fav)
console.log(`favicon: T bbox [${minX.toFixed(0)},${minY.toFixed(0)} ${bw.toFixed(0)}x${bh.toFixed(0)}] scale ${scale.toFixed(4)}`)
console.log('wrote src/components/trimly-logo-paths.ts and public/favicon.svg')
