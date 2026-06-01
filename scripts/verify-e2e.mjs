// Live end-to-end walk of the core loop against the Definition of Done, using the
// seeded demo accounts through the anon client (RLS enforced) - exactly the browser path.
// Leaves the demo data pristine afterward (cleans up the test booking via the token).
//   node scripts/verify-e2e.mjs
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split('\n').filter(Boolean).map((l) => {
    const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)
const URL = env.VITE_SUPABASE_URL
const ANON = env.VITE_SUPABASE_ANON_KEY
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN

const mk = () => createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
const signIn = async (sb, email) => {
  const { error } = await sb.auth.signInWithPassword({ email, password: 'trimly123' })
  if (error) throw new Error(`sign in ${email}: ${error.message}`)
}
const mgmt = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/madsedhycdiattoaypyl/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!r.ok) throw new Error(`mgmt sql: ${await r.text()}`)
}

let pass = true
const ok = (name, cond, detail) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} - ${name}${detail ? `  (${detail})` : ''}`)
  if (!cond) pass = false
}

// 1. CLIENT searches 10001
const client = mk()
await signIn(client, 'client@trimly.demo')
const clientId = (await client.auth.getUser()).data.user.id

const { data: found } = await client.from('barbershops').select('*').eq('zip', '10001').eq('is_active', true)
const shop = (found ?? []).find((s) => s.shop_name === 'Fade & Co.')
ok('client searches 10001 → sees the seeded active barber', !!shop, `${found?.length ?? 0} result(s)`)

const { data: inactiveZip } = await client.from('barbershops').select('id').eq('zip', '10002').eq('is_active', true)
ok('inactive shop in another ZIP is filtered out', (inactiveZip?.length ?? 0) === 0)

if (!shop) { console.log('\n❌ cannot continue without the seeded shop'); process.exit(1) }

// 2. open slots
const { data: slots } = await client
  .from('availability_slots').select('*')
  .eq('barbershop_id', shop.id).eq('is_booked', false)
  .gte('starts_at', new Date().toISOString()).order('starts_at')
ok('barber profile shows open future slots', (slots?.length ?? 0) > 0, `${slots?.length ?? 0} open`)

// 3. BARBER subscribes to realtime BEFORE the client books
const barber = mk()
const { data: barberSignIn } = await barber.auth.signInWithPassword({ email: 'barber@trimly.demo', password: 'trimly123' })
await barber.realtime.setAuth(barberSignIn.session.access_token)
let realtimeFired = false
const channel = barber
  .channel(`verify:${shop.id}`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'appointments', filter: `barbershop_id=eq.${shop.id}` },
    () => { realtimeFired = true })
// Wait until the channel is genuinely SUBSCRIBED before booking, or the insert is missed.
const subscribed = await new Promise((res) => {
  channel.subscribe((status) => { if (status === 'SUBSCRIBED') res(true) })
  setTimeout(() => res(false), 15000)
})
if (!subscribed) console.log('  (warning: realtime channel did not reach SUBSCRIBED)')

// 4. CLIENT books the first slot via the atomic RPC
const { data: appt, error: bookErr } = await client.rpc('book_slot', { p_slot_id: slots[0].id, p_service: 'Haircut' })
ok('client books a slot (atomic book_slot rpc)', !bookErr && !!appt, bookErr?.message)

// 5. slot is now booked
const { data: slotAfter } = await client.from('availability_slots').select('is_booked').eq('id', slots[0].id).maybeSingle()
ok('booked slot is marked is_booked', slotAfter?.is_booked === true)

// 6. appears in My Bookings with coordinates for directions
const { data: myb } = await client
  .from('appointments')
  .select('id, service, barbershop:barbershops(shop_name, latitude, longitude), slot:availability_slots(starts_at)')
  .eq('client_id', clientId).order('created_at', { ascending: false })
const mine = (myb ?? []).find((b) => b.id === appt?.id)
ok('booking shows in My Bookings with coords (Get directions works)',
  !!mine && mine.barbershop?.latitude != null && mine.barbershop?.longitude != null)

// 7. barber sees the booking WITH the client's name (barber_sees_client policy)
const { data: incoming } = await barber
  .from('appointments')
  .select('id, client:profiles!appointments_client_id_fkey(full_name)')
  .eq('barbershop_id', shop.id).order('created_at', { ascending: false })
const seen = (incoming ?? []).find((b) => b.id === appt?.id)
ok('barber sees the new booking with client name', !!seen && seen.client?.full_name === 'Casey Client', seen?.client?.full_name)

// 8. realtime fired (Supabase WAL can lag a few seconds; poll up to ~10s)
for (let i = 0; i < 20 && !realtimeFired; i++) await new Promise((r) => setTimeout(r, 500))
ok('barber received the booking live (realtime INSERT)', realtimeFired)
await barber.removeChannel(channel)

// 9. subscription toggle off → shop leaves client search
await barber.from('barbershops').update({ is_active: false, subscription_status: 'inactive' }).eq('id', shop.id)
const { data: afterOff } = await client.from('barbershops').select('id').eq('zip', '10001').eq('is_active', true)
ok('subscription OFF → shop disappears from client search', !(afterOff ?? []).some((s) => s.id === shop.id))
await barber.from('barbershops').update({ is_active: true, subscription_status: 'active' }).eq('id', shop.id) // restore

// 10. ADMIN: tickets + status change + report counts
const admin = mk()
await signIn(admin, 'admin@trimly.demo')
const { data: tickets } = await admin
  .from('support_tickets')
  .select('id, subject, status, opener:profiles!support_tickets_opened_by_fkey(full_name)')
ok('admin sees support tickets', (tickets?.length ?? 0) > 0, `${tickets?.length ?? 0} ticket(s)`)
if (tickets?.[0]) {
  const { error: upErr } = await admin.from('support_tickets').update({ status: 'closed' }).eq('id', tickets[0].id)
  ok('admin can change a ticket status', !upErr)
  await admin.from('support_tickets').update({ status: 'open' }).eq('id', tickets[0].id) // restore
}
const head = { count: 'exact', head: true }
const [b, s, u, t] = await Promise.all([
  admin.from('appointments').select('*', head),
  admin.from('barbershops').select('*', head).eq('is_active', true),
  admin.from('profiles').select('*', head),
  admin.from('support_tickets').select('*', head).eq('status', 'open'),
])
ok('admin report shows non-zero counts',
  (b.count ?? 0) > 0 && (s.count ?? 0) > 0 && (u.count ?? 0) > 0,
  `bookings=${b.count} activeShops=${s.count} users=${u.count} openTickets=${t.count}`)

// Cleanup: remove the test booking so the demo stays pristine (5 open slots, no bookings).
if (appt?.id && TOKEN) {
  await mgmt(`delete from public.appointments where id='${appt.id}'; update public.availability_slots set is_booked=false where id='${slots[0].id}';`)
  console.log('› cleaned up the test booking (demo data reset to pristine)')
}

console.log(`\n${pass ? '✅ END-TO-END PASSED' : '❌ END-TO-END FAILED'}`)
process.exit(pass ? 0 : 1)
