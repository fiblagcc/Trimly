// Real-browser checks via Playwright against the local dev server.
// Drives the actual React auth flow (which curl/bundle checks cannot), logs in as
// each role, asserts the redirect to the right dashboard, and screenshots key pages.
//   node e2e/pw-check.mjs            (defaults to http://localhost:4173)
//   BASE=https://beta-trimly.vercel.app node e2e/pw-check.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://localhost:4173'
const SHOTS = 'e2e/shots'
mkdirSync(SHOTS, { recursive: true })

const ROLES = [
  { role: 'client', email: 'client@trimly.demo' },
  { role: 'barber', email: 'barber@trimly.demo' },
  { role: 'admin', email: 'admin@trimly.demo' },
]
const PW = 'trimly123'

let pass = true
const ok = (name, cond, detail) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} - ${name}${detail ? `  (${detail})` : ''}`)
  if (!cond) pass = false
}

const browser = await chromium.launch()

// Public pages first (no auth).
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.screenshot({ path: `${SHOTS}/landing.png`, fullPage: true })
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.screenshot({ path: `${SHOTS}/login.png` })
  await page.close()
}

for (const { role, email } of ROLES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    await page.fill('#email', email)
    await page.fill('#password', PW)
    await page.click('button[type=submit]')
    // The whole point: does sign-in actually land us on the dashboard?
    await page.waitForURL(`**/${role}`, { timeout: 12000 })
    // And does the dashboard actually render (not a blank/guard bounce)?
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    const url = page.url()
    ok(`${role}: sign in lands on /${role}`, url.endsWith(`/${role}`), url.replace(BASE, ''))
    await page.screenshot({ path: `${SHOTS}/${role}.png`, fullPage: true })
  } catch (e) {
    ok(`${role}: sign in lands on /${role}`, false, `stuck at ${page.url().replace(BASE, '')} (${e.message.split('\n')[0]})`)
    await page.screenshot({ path: `${SHOTS}/${role}-FAIL.png` }).catch(() => {})
  } finally {
    await ctx.close()
  }
}

await browser.close()
console.log(`\n${pass ? '✅ ALL LOGINS PASS' : '❌ LOGIN CHECK FAILED'}  (screenshots in ${SHOTS}/)`)
process.exit(pass ? 0 : 1)
