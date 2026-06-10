-- Trimly demo seed (SPEC §8). Idempotent — safe to re-run; availability is rebuilt so
-- the demo always has a full runway of future slots. Apply AFTER migrations/0001_init.sql
-- (and 0002–0004, already live on madsedhycdiattoaypyl).
--
--   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/db-apply.mjs supabase/seed.sql
--
-- Demo accounts (demo only — these passwords are not for anything real):
--   client@trimly.demo / trimly123   (client)
--   barber@trimly.demo / trimly123   (barber, owns Fade & Co. — the "book up" shop)
--   admin@trimly.demo  / trimly123   (admin)
--   barber4/5/6@trimly.demo / trimly123  (own the three extra active shops in 10001)

-- Fixed UUIDs so re-runs are stable.
-- users
--   client  11111111-1111-4111-8111-111111111111
--   barber  22222222-2222-4222-8222-222222222222  (Fade & Co.)
--   admin   33333333-3333-4333-8333-333333333333
--   barber2 44444444-4444-4444-8444-444444444444  (inactive shop, 10002)
--   barber3 55555555-5555-4555-8555-555555555555  (inactive shop, 90210)
--   barber4 66666666-6666-4666-8666-666666666666  (Gotham Cuts, 10001)
--   barber5 77777777-7777-4777-8777-777777777777  (Empire Barbershop, 10001)
--   barber6 88888888-8888-4888-8888-888888888888  (Midtown Fades, 10001)

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
   '{"provider":"email","providers":["email"]}', '{"role":"barber","full_name":"Sam Shears"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '66666666-6666-4666-8666-666666666666',
   'authenticated', 'authenticated', 'barber4@trimly.demo', crypt('trimly123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"role":"barber","full_name":"Theo Vance"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '77777777-7777-4777-8777-777777777777',
   'authenticated', 'authenticated', 'barber5@trimly.demo', crypt('trimly123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"role":"barber","full_name":"Luis Romero"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '88888888-8888-4888-8888-888888888888',
   'authenticated', 'authenticated', 'barber6@trimly.demo', crypt('trimly123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"role":"barber","full_name":"Andre Wells"}', now(), now(), '', '', '', '')
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
   '{"sub":"55555555-5555-4555-8555-555555555555","email":"barber3@trimly.demo"}', 'email', now(), now(), now()),
  ('66666666-6666-4666-8666-666666666666', '66666666-6666-4666-8666-666666666666',
   '{"sub":"66666666-6666-4666-8666-666666666666","email":"barber4@trimly.demo"}', 'email', now(), now(), now()),
  ('77777777-7777-4777-8777-777777777777', '77777777-7777-4777-8777-777777777777',
   '{"sub":"77777777-7777-4777-8777-777777777777","email":"barber5@trimly.demo"}', 'email', now(), now(), now()),
  ('88888888-8888-4888-8888-888888888888', '88888888-8888-4888-8888-888888888888',
   '{"sub":"88888888-8888-4888-8888-888888888888","email":"barber6@trimly.demo"}', 'email', now(), now(), now())
on conflict (provider, provider_id) do nothing;

-- Profiles (trigger usually creates these; upsert keeps role/name deterministic).
insert into public.profiles (id, role, full_name) values
  ('11111111-1111-4111-8111-111111111111', 'client', 'Casey Client'),
  ('22222222-2222-4222-8222-222222222222', 'barber', 'Marcus Fade'),
  ('33333333-3333-4333-8333-333333333333', 'admin',  'Avery Admin'),
  ('44444444-4444-4444-8444-444444444444', 'barber', 'Dana Clipper'),
  ('55555555-5555-4555-8555-555555555555', 'barber', 'Sam Shears'),
  ('66666666-6666-4666-8666-666666666666', 'barber', 'Theo Vance'),
  ('77777777-7777-4777-8777-777777777777', 'barber', 'Luis Romero'),
  ('88888888-8888-4888-8888-888888888888', 'barber', 'Andre Wells')
on conflict (id) do update set role = excluded.role, full_name = excluded.full_name;

-- ── Active shops in ZIP 10001 (what the client sees on search) ────────────────
-- Fade & Co. is the headline shop owned by barber@trimly.demo.
insert into public.barbershops (id, owner_id, shop_name, bio, zip, address, latitude, longitude, is_active, subscription_status)
values (
  'aaaaaaaa-0000-4000-8000-0000000000a1',
  '22222222-2222-4222-8222-222222222222',
  'Fade & Co.',
  'Classic cuts, sharp fades, and a proper hot-towel finish. Walk-ins welcome, bookings preferred.',
  '10001', '312 W 31st St, New York, NY', 40.7506, -73.9972, true, 'active'
)
on conflict (id) do update set
  shop_name = excluded.shop_name, owner_id = excluded.owner_id, bio = excluded.bio,
  is_active = excluded.is_active, subscription_status = excluded.subscription_status,
  zip = excluded.zip, address = excluded.address,
  latitude = excluded.latitude, longitude = excluded.longitude;

-- Three more active shops in 10001 so the client has real choices to compare.
insert into public.barbershops (id, owner_id, shop_name, bio, zip, address, latitude, longitude, is_active, subscription_status)
values
  ('dddddddd-0000-4000-8000-0000000000d4', '66666666-6666-4666-8666-666666666666',
   'Gotham Cuts', 'Upscale grooming with skin fades, sculpted beards, and a proper hot-towel finish.',
   '10001', '245 W 29th St, New York, NY', 40.7486, -73.9959, true, 'active'),
  ('eeeeeeee-0000-4000-8000-0000000000e5', '77777777-7777-4777-8777-777777777777',
   'Empire Barbershop', 'A no-fuss neighborhood chair. Honest prices, clean lines, in and out.',
   '10001', '119 W 34th St, New York, NY', 40.7498, -73.9876, true, 'active'),
  ('ffffffff-0000-4000-8000-0000000000f6', '88888888-8888-4888-8888-888888888888',
   'Midtown Fades', 'Tapers, custom designs, and fresh fades. Good music, sharp work.',
   '10001', '51 W 28th St, New York, NY', 40.7456, -73.9897, true, 'active')
on conflict (id) do update set
  shop_name = excluded.shop_name, owner_id = excluded.owner_id, bio = excluded.bio,
  is_active = excluded.is_active, subscription_status = excluded.subscription_status,
  zip = excluded.zip, address = excluded.address,
  latitude = excluded.latitude, longitude = excluded.longitude;

-- Two inactive shops elsewhere — proves the search filter (is_active + zip) works.
insert into public.barbershops (id, owner_id, shop_name, bio, zip, address, latitude, longitude, is_active, subscription_status)
values
  ('bbbbbbbb-0000-4000-8000-0000000000b2', '44444444-4444-4444-8444-444444444444',
   'Downtown Trims', 'Not currently subscribed.', '10002', '88 Delancey St, New York, NY', 40.7180, -73.9880, false, 'inactive'),
  ('cccccccc-0000-4000-8000-0000000000c3', '55555555-5555-4555-8555-555555555555',
   'Beverly Barbers', 'Not currently subscribed.', '90210', '420 N Beverly Dr, Beverly Hills, CA', 34.0700, -118.4000, false, 'inactive')
on conflict (id) do update set is_active = excluded.is_active;

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

-- ── Service menus (price_cents, duration_min) ────────────────────────────────
insert into public.services (barbershop_id, name, price_cents, duration_min, is_active)
select v.shop::uuid, v.name, v.price_cents, v.duration_min, true
from (values
  -- Fade & Co.
  ('aaaaaaaa-0000-4000-8000-0000000000a1', 'Haircut', 3000, 30),
  ('aaaaaaaa-0000-4000-8000-0000000000a1', 'Beard trim', 1500, 15),
  ('aaaaaaaa-0000-4000-8000-0000000000a1', 'Haircut + beard', 4000, 45),
  ('aaaaaaaa-0000-4000-8000-0000000000a1', 'Hot towel shave', 3500, 30),
  ('aaaaaaaa-0000-4000-8000-0000000000a1', 'Kids cut', 2000, 30),
  -- Gotham Cuts (upscale)
  ('dddddddd-0000-4000-8000-0000000000d4', 'Signature cut', 4500, 45),
  ('dddddddd-0000-4000-8000-0000000000d4', 'Skin fade', 3500, 30),
  ('dddddddd-0000-4000-8000-0000000000d4', 'Beard sculpt', 2500, 20),
  ('dddddddd-0000-4000-8000-0000000000d4', 'Hot towel shave', 4000, 30),
  ('dddddddd-0000-4000-8000-0000000000d4', 'Buzz cut', 2000, 15),
  -- Empire Barbershop (value)
  ('eeeeeeee-0000-4000-8000-0000000000e5', 'Haircut', 2500, 30),
  ('eeeeeeee-0000-4000-8000-0000000000e5', 'Fade', 2800, 30),
  ('eeeeeeee-0000-4000-8000-0000000000e5', 'Beard trim', 1200, 15),
  ('eeeeeeee-0000-4000-8000-0000000000e5', 'Kids cut', 1800, 30),
  ('eeeeeeee-0000-4000-8000-0000000000e5', 'Line up', 1000, 10),
  -- Midtown Fades (trendy)
  ('ffffffff-0000-4000-8000-0000000000f6', 'Fade', 3200, 30),
  ('ffffffff-0000-4000-8000-0000000000f6', 'Taper', 3000, 30),
  ('ffffffff-0000-4000-8000-0000000000f6', 'Custom design', 1500, 15),
  ('ffffffff-0000-4000-8000-0000000000f6', 'Beard', 1800, 20),
  ('ffffffff-0000-4000-8000-0000000000f6', 'Cut + beard', 4500, 45)
) as v(shop, name, price_cents, duration_min)
where not exists (
  select 1 from public.services s where s.barbershop_id = v.shop::uuid and s.name = v.name
);

-- ── Weekly hours: Mon–Fri 9–7, Sat 9–6, Sun closed (all four active shops) ────
insert into public.business_hours (barbershop_id, day_of_week, open_time, close_time, is_closed)
select shop::uuid, d.dow,
  '09:00'::time,
  case when d.dow = 6 then '18:00' else '19:00' end::time,
  (d.dow = 0)
from (values
  ('aaaaaaaa-0000-4000-8000-0000000000a1'),
  ('dddddddd-0000-4000-8000-0000000000d4'),
  ('eeeeeeee-0000-4000-8000-0000000000e5'),
  ('ffffffff-0000-4000-8000-0000000000f6')
) as shops(shop)
cross join (select generate_series(0, 6) as dow) d
on conflict (barbershop_id, day_of_week) do nothing;

-- ── Reviews (so every active shop shows a rating). Fixed ids keep this idempotent;
-- appointment_id is null (these are seed ratings, not tied to a specific visit). ──
insert into public.reviews (id, barbershop_id, client_id, appointment_id, rating, comment) values
  ('face0001-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-0000000000a1', '11111111-1111-4111-8111-111111111111', null, 5, 'Best fade in Chelsea. Been coming for years.'),
  ('face0002-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-0000000000a1', '11111111-1111-4111-8111-111111111111', null, 4, 'Great cut, small wait but worth it.'),
  ('a0a00001-0000-4000-8000-000000000011', 'dddddddd-0000-4000-8000-0000000000d4', '11111111-1111-4111-8111-111111111111', null, 5, 'Clean skin fade and a sharp line-up. Highly recommend.'),
  ('a0a00002-0000-4000-8000-000000000012', 'dddddddd-0000-4000-8000-0000000000d4', '11111111-1111-4111-8111-111111111111', null, 5, 'Theo takes his time and it shows.'),
  ('a0a00003-0000-4000-8000-000000000013', 'dddddddd-0000-4000-8000-0000000000d4', '11111111-1111-4111-8111-111111111111', null, 4, 'Premium feel, premium price, no complaints.'),
  ('b0b00001-0000-4000-8000-000000000021', 'eeeeeeee-0000-4000-8000-0000000000e5', '11111111-1111-4111-8111-111111111111', null, 4, 'Solid classic cut at a fair price.'),
  ('b0b00002-0000-4000-8000-000000000022', 'eeeeeeee-0000-4000-8000-0000000000e5', '11111111-1111-4111-8111-111111111111', null, 5, 'In and out, exactly what I asked for.'),
  ('c0c00001-0000-4000-8000-000000000031', 'ffffffff-0000-4000-8000-0000000000f6', '11111111-1111-4111-8111-111111111111', null, 5, 'The design work is next level.'),
  ('c0c00002-0000-4000-8000-000000000032', 'ffffffff-0000-4000-8000-0000000000f6', '11111111-1111-4111-8111-111111111111', null, 4, 'Trendy spot, good music, clean fade.'),
  ('c0c00003-0000-4000-8000-000000000033', 'ffffffff-0000-4000-8000-0000000000f6', '11111111-1111-4111-8111-111111111111', null, 5, 'Andre nailed the taper.')
on conflict (id) do update set rating = excluded.rating, comment = excluded.comment;

-- ── Availability: rebuild future open slots. Fade & Co. gets a full month (the demo
-- "book up" shop, per barber@trimly.demo); the others get ~2 weeks. Times are generated
-- in America/New_York so they land in real business hours. Booked slots are untouched. ──
delete from public.availability_slots
where is_booked = false
  and starts_at > now()
  and barbershop_id in (
    'aaaaaaaa-0000-4000-8000-0000000000a1',
    'dddddddd-0000-4000-8000-0000000000d4',
    'eeeeeeee-0000-4000-8000-0000000000e5',
    'ffffffff-0000-4000-8000-0000000000f6'
  );

insert into public.availability_slots (barbershop_id, starts_at, duration_min, is_booked)
select c.shop,
       (date_trunc('day', now() at time zone 'America/New_York')
          + make_interval(days => g1.d, hours => g2.h)) at time zone 'America/New_York',
       c.dur, false
from (values
  ('aaaaaaaa-0000-4000-8000-0000000000a1'::uuid, 30, 9, 17, 30),   -- Fade & Co.: ~1 month, hourly 9am–5pm
  ('dddddddd-0000-4000-8000-0000000000d4'::uuid, 13, 11, 16, 45),  -- Gotham: ~2 weeks
  ('eeeeeeee-0000-4000-8000-0000000000e5'::uuid, 13, 10, 15, 30),  -- Empire: ~2 weeks
  ('ffffffff-0000-4000-8000-0000000000f6'::uuid, 13, 12, 17, 30)   -- Midtown: ~2 weeks
) as c(shop, ndays, h_start, h_end, dur)
cross join lateral generate_series(0, c.ndays) as g1(d)
cross join lateral generate_series(c.h_start, c.h_end) as g2(h)
where extract(dow from (date_trunc('day', now() at time zone 'America/New_York') + make_interval(days => g1.d))) <> 0  -- skip Sundays
  and (date_trunc('day', now() at time zone 'America/New_York') + make_interval(days => g1.d, hours => g2.h)) at time zone 'America/New_York'
      > now() + interval '30 minutes';
