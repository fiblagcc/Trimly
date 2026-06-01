// Applies a .sql file to the live Supabase project via the Management API.
// Usage:  SUPABASE_ACCESS_TOKEN=sbp_... node scripts/db-apply.mjs supabase/migrations/0001_init.sql
// The token is a Supabase Personal Access Token (Account → Access Tokens). It is read
// from the environment only — never hard-code or commit it.
import { readFileSync, existsSync } from 'node:fs'

const PROJECT_REF = 'madsedhycdiattoaypyl'

// Token from the env var, or fall back to a SUPABASE_ACCESS_TOKEN line in .env
// (which is gitignored, so the secret never enters chat or the repo).
function tokenFromEnvFile() {
  if (!existsSync('.env')) return undefined
  const line = readFileSync('.env', 'utf8')
    .split('\n')
    .find((l) => l.trim().startsWith('SUPABASE_ACCESS_TOKEN='))
  return line ? line.slice(line.indexOf('=') + 1).trim() : undefined
}

const token = process.env.SUPABASE_ACCESS_TOKEN || tokenFromEnvFile()
const file = process.argv[2]

if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN env var. Create one at https://supabase.com/dashboard/account/tokens')
  process.exit(1)
}
if (!file) {
  console.error('Usage: node scripts/db-apply.mjs <path-to.sql>')
  process.exit(1)
}

const query = readFileSync(file, 'utf8')
const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }),
})

const text = await res.text()
if (!res.ok) {
  console.error(`✗ ${file} failed — HTTP ${res.status}`)
  console.error(text)
  process.exit(1)
}
console.log(`✓ applied ${file}`)
if (text && text !== '[]' && text !== 'null') console.log(text.slice(0, 800))
