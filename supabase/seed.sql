-- Trimly demo seed (SPEC §8). Idempotent — safe to re-run; slot times refresh so the
-- demo always has future availability. Apply AFTER migrations/0001_init.sql.
--
--   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/db-apply.mjs supabase/seed.sql
--
-- Demo accounts (demo only — these passwords are not for anything real):
--   client@trimly.demo / trimly123   (client)
--   barber@trimly.demo / trimly123   (barber, owns the active shop in 10001)
--   admin@trimly.demo  / trimly123   (admin)

-- Fixed UUIDs so re-runs are stable.
-- users
--   client  11111111-1111-4111-8111-111111111111
--   barber  22222222-2222-4222-8222-222222222222
--   admin   33333333-3333-4333-8333-333333333333
--   barber2 44444444-4444-4444-8444-444444444444  (owns an inactive shop)
--   barber3 55555555-5555-4555-8555-555555555555  (owns an inactive shop)

-- ── Demo auth users (email confirmed so they can sign in immediately) ─────────
-- The four token columns are set to '' on purpose: they have no default, and GoTrue
-- refuses to authenticate a user row where they are NULL ("Database error querying schema").
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111',
   'authenticated', 'authenticated', 'client@trimly.demo', crypt('trimly123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"role":"client","full_name":"Casey Client"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222',
   'authenticated', 'authenticated', 'barber@trimly.demo', crypt('trimly123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"role":"barber","full_name":"Marcus Fade"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333333',
   'authenticated', 'authenticated', 'admin@trimly.demo', crypt('trimly123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"role":"admin","full_name":"Avery Admin"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-8444-444444444444',
   'authenticated', 'authenticated', 'barber2@trimly.demo', crypt('trimly123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"role":"barber","full_name":"Dana Clipper"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '55555555-5555-4555-8555-555555555555',
   'authenticated', 'authenticated', 'barber3@trimly.demo', crypt('trimly123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"role":"barber","full_name":"Sam Shears"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

-- Email identities (required for password sign-in).
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  ('11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111',
   '{"sub":"11111111-1111-4111-8111-111111111111","email":"client@trimly.demo"}', 'email', now(), now(), now()),
  ('22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222',
   '{"sub":"22222222-2222-4222-8222-222222222222","email":"barber@trimly.demo"}', 'email', now(), now(), now()),
  ('33333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333',
   '{"sub":"33333333-3333-4333-8333-333333333333","email":"admin@trimly.demo"}', 'email', now(), now(), now()),
  ('44444444-4444-4444-8444-444444444444', '44444444-4444-4444-8444-444444444444',
   '{"sub":"44444444-4444-4444-8444-444444444444","email":"barber2@trimly.demo"}', 'email', now(), now(), now()),
  ('55555555-5555-4555-8555-555555555555', '55555555-5555-4555-8555-555555555555',
   '{"sub":"55555555-5555-4555-8555-555555555555","email":"barber3@trimly.demo"}', 'email', now(), now(), now())
on conflict (provider, provider_id) do nothing;

-- Profiles (trigger usually creates these; upsert keeps role/name deterministic).
insert into public.profiles (id, role, full_name) values
  ('11111111-1111-4111-8111-111111111111', 'client', 'Casey Client'),
  ('22222222-2222-4222-8222-222222222222', 'barber', 'Marcus Fade'),
  ('33333333-3333-4333-8333-333333333333', 'admin',  'Avery Admin'),
  ('44444444-4444-4444-8444-444444444444', 'barber', 'Dana Clipper'),
  ('55555555-5555-4555-8555-555555555555', 'barber', 'Sam Shears')
on conflict (id) do update set role = excluded.role, full_name = excluded.full_name;

-- ── The active shop in ZIP 10001 (visible in client search) ──────────────────
insert into public.barbershops (id, owner_id, shop_name, bio, zip, address, latitude, longitude, is_active, subscription_status)
values (
  'aaaaaaaa-0000-4000-8000-0000000000a1',
  '22222222-2222-4222-8222-222222222222',
  'Fade & Co.',
  'Classic cuts, sharp fades, and a proper hot-towel finish. Walk-ins welcome, bookings preferred.',
  '10001', '312 W 31st St, New York, NY', 40.7506, -73.9972, true, 'active'
)
on conflict (id) do update set
  is_active = excluded.is_active, subscription_status = excluded.subscription_status,
  zip = excluded.zip, latitude = excluded.latitude, longitude = excluded.longitude;

-- Two inactive shops elsewhere — proves the search filter (is_active + zip) works.
insert into public.barbershops (id, owner_id, shop_name, bio, zip, address, latitude, longitude, is_active, subscription_status)
values
  ('bbbbbbbb-0000-4000-8000-0000000000b2', '44444444-4444-4444-8444-444444444444',
   'Downtown Trims', 'Not currently subscribed.', '10002', '88 Delancey St, New York, NY', 40.7180, -73.9880, false, 'inactive'),
  ('cccccccc-0000-4000-8000-0000000000c3', '55555555-5555-4555-8555-555555555555',
   'Beverly Barbers', 'Not currently subscribed.', '90210', '420 N Beverly Dr, Beverly Hills, CA', 34.0700, -118.4000, false, 'inactive')
on conflict (id) do update set is_active = excluded.is_active;

-- ── Five future availability slots on the active shop ────────────────────────
-- starts_at is refreshed on every run so the demo always shows upcoming times.
insert into public.availability_slots (id, barbershop_id, starts_at, duration_min, is_booked) values
  ('5107a001-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-0000000000a1', date_trunc('hour', now()) + interval '1 day 9 hours',  30, false),
  ('5107a002-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-0000000000a1', date_trunc('hour', now()) + interval '1 day 10 hours', 30, false),
  ('5107a003-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-0000000000a1', date_trunc('hour', now()) + interval '2 day 11 hours', 45, false),
  ('5107a004-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-0000000000a1', date_trunc('hour', now()) + interval '2 day 14 hours', 30, false),
  ('5107a005-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-0000000000a1', date_trunc('hour', now()) + interval '3 day 16 hours', 60, false)
on conflict (id) do update set starts_at = excluded.starts_at, is_booked = false;

-- ── One open support ticket (opened by the demo client) ──────────────────────
insert into public.support_tickets (id, opened_by, subject, body, status)
values (
  '71c0e701-0000-4000-8000-000000000001',
  '11111111-1111-4111-8111-111111111111',
  'How do I reschedule a booking?',
  'I booked the wrong time and want to move it to later in the week.',
  'open'
)
on conflict (id) do update set status = excluded.status;
