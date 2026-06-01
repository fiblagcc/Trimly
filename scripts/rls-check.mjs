// CHECKPOINT 1 (SPEC §5 / PROJECT_CONTEXT): prove a client cannot read another
// client's data through the Supabase JS client under RLS.
//
// Setup is done with the Management API (runs as superuser, bypasses RLS) so we can
// plant two clients + their appointments deterministically. The actual ASSERTIONS
// run through the anon JS client logged in as client A — i.e. exactly the path the
// browser uses, with RLS fully enforced.
//
// Usage:  SUPABASE_ACCESS_TOKEN=sbp_... node scripts/rls-check.mjs
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const PROJECT_REF = 'madsedhycdiattoaypyl'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split('\n').filter(Boolean).map((l) => {
    const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)
const URL = env.VITE_SUPABASE_URL
const ANON = env.VITE_SUPABASE_ANON_KEY
// Token from env var or the gitignored .env (keeps the secret out of chat + repo).
const token = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN
if (!token) { console.error('Missing SUPABASE_ACCESS_TOKEN'); process.exit(1) }

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const t = await r.text()
  if (!r.ok) throw new Error(`SQL failed (${r.status}): ${t}`)
  return t ? JSON.parse(t) : null
}

// Fixed UUIDs so the script is idempotent. A and B are PURE CLIENTS; a SEPARATE
// barber owns the shop — otherwise A (as owner) would legitimately see B's booking
// and the test would prove nothing.
const OWNER = '00000000-0000-4000-a000-0000000000c1' // barber who owns the shop
const A = '00000000-0000-4000-a000-000000000a01' // client A
const B = '00000000-0000-4000-a000-000000000b02' // client B
const SHOP = '00000000-0000-4000-a000-0000000005ff'
const SLOT_A = '00000000-0000-4000-a000-0000000051a1'
const SLOT_B = '00000000-0000-4000-a000-0000000051b2'
const APPT_A = '00000000-0000-4000-a000-0000000091a1'
const APPT_B = '00000000-0000-4000-a000-0000000091b2'
const PW = 'rlscheck123'

// GoTrue rejects auth.users rows with NULL token columns ("Database error querying
// schema"), so set the no-default ones to ''.
const TOKENS = `'', '', '', ''`
const TOKEN_COLS = 'confirmation_token, recovery_token, email_change_token_new, email_change'

console.log('› planting a barber-owned shop + two clients with a booking each…')
await sql(`
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    ${TOKEN_COLS})
  values
    ('00000000-0000-0000-0000-000000000000', '${OWNER}', 'authenticated', 'authenticated',
     'rls_owner@trimly.test', crypt('${PW}', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"role":"barber"}', now(), now(), ${TOKENS}),
    ('00000000-0000-0000-0000-000000000000', '${A}', 'authenticated', 'authenticated',
     'rls_a@trimly.test', crypt('${PW}', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"role":"client"}', now(), now(), ${TOKENS}),
    ('00000000-0000-0000-0000-000000000000', '${B}', 'authenticated', 'authenticated',
     'rls_b@trimly.test', crypt('${PW}', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"role":"client"}', now(), now(), ${TOKENS})
  on conflict (id) do nothing;

  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values
    ('${OWNER}', '${OWNER}', '{"sub":"${OWNER}","email":"rls_owner@trimly.test"}', 'email', now(), now(), now()),
    ('${A}', '${A}', '{"sub":"${A}","email":"rls_a@trimly.test"}', 'email', now(), now(), now()),
    ('${B}', '${B}', '{"sub":"${B}","email":"rls_b@trimly.test"}', 'email', now(), now(), now())
  on conflict (provider, provider_id) do nothing;

  -- profiles are created by the signup trigger; ensure present in case it was off
  insert into public.profiles (id, role, full_name) values
    ('${OWNER}', 'barber', 'RLS Barber'), ('${A}', 'client', 'RLS Client A'), ('${B}', 'client', 'RLS Client B')
  on conflict (id) do nothing;

  insert into public.barbershops (id, owner_id, shop_name, zip, is_active, subscription_status)
  values ('${SHOP}', '${OWNER}', 'RLS Test Shop', '00000', true, 'active')
  on conflict (id) do nothing;

  insert into public.availability_slots (id, barbershop_id, starts_at, is_booked) values
    ('${SLOT_A}', '${SHOP}', now() + interval '1 day', true),
    ('${SLOT_B}', '${SHOP}', now() + interval '2 day', true)
  on conflict (id) do nothing;

  insert into public.appointments (id, slot_id, client_id, barbershop_id, service) values
    ('${APPT_A}', '${SLOT_A}', '${A}', '${SHOP}', 'Cut'),
    ('${APPT_B}', '${SLOT_B}', '${B}', '${SHOP}', 'Cut')
  on conflict (id) do nothing;
`)

const a = createClient(URL, ANON)
const { error: signInErr } = await a.auth.signInWithPassword({ email: 'rls_a@trimly.test', password: PW })
if (signInErr) { console.error('could not sign in as client A:', signInErr.message); process.exit(1) }
console.log('› signed in as client A through the anon client (RLS enforced)\n')

let pass = true
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? `  (${detail})` : ''}`)
  if (!ok) pass = false
}

// 1. A reads appointments → sees only its own, never B's.
{
  const { data } = await a.from('appointments').select('id, client_id')
  const ids = (data ?? []).map((r) => r.id)
  check('client A lists appointments → only own rows',
    ids.includes(APPT_A) && !ids.includes(APPT_B), `saw ${ids.length} row(s)`)
}
// 2. A targets B's appointment by id → zero rows (not an error: RLS filters silently).
{
  const { data } = await a.from('appointments').select('id').eq('id', APPT_B)
  check("client A cannot fetch client B's appointment by id", (data ?? []).length === 0)
}
// 3. A cannot read B's profile.
{
  const { data } = await a.from('profiles').select('id').eq('id', B)
  check("client A cannot read client B's profile", (data ?? []).length === 0)
}
// 4. Sanity: A can still read its own appointment and the active shop.
{
  const { data: own } = await a.from('appointments').select('id').eq('id', APPT_A)
  const { data: shop } = await a.from('barbershops').select('id').eq('id', SHOP)
  check('client A can read its own appointment + the active shop',
    (own ?? []).length === 1 && (shop ?? []).length === 1)
}

await a.auth.signOut()
console.log(`\n${pass ? '✅ RLS CHECK PASSED' : '❌ RLS CHECK FAILED — fix the policy, do not disable RLS'}`)

// Clean up the test rows so they don't pollute the demo.
await sql(`
  delete from public.appointments where id in ('${APPT_A}', '${APPT_B}');
  delete from public.availability_slots where id in ('${SLOT_A}', '${SLOT_B}');
  delete from public.barbershops where id = '${SHOP}';
  delete from public.profiles where id in ('${OWNER}', '${A}', '${B}');
  delete from auth.identities where user_id in ('${OWNER}', '${A}', '${B}');
  delete from auth.users where id in ('${OWNER}', '${A}', '${B}');
`)
console.log('› cleaned up test rows')
process.exit(pass ? 0 : 1)
