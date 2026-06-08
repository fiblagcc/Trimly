-- Trimly — migration 0002: phone-app backend sync.
--
-- The mobile team (branch `trimly-phone-app`) extended the SHARED Supabase project
-- directly on the live DB while building the Android app, and never captured those
-- changes as a migration. This file records them so the repo is the source of truth
-- again and a fresh database can be rebuilt from `0001` + `0002`.
--
-- Everything here is ALREADY APPLIED to the live project (`madsedhycdiattoaypyl`);
-- it was reverse-engineered from the live catalog on 2026-06-08. It is idempotent and
-- a no-op against the live DB, so it does not need to be re-applied there. RLS is
-- enabled on every new table using the same owns_shop / shop_is_active / is_admin /
-- auth.uid() patterns as `0001` (verified: no table is world-readable).

-- ─────────────────────────────────────────────────────────────────────────────
-- Columns added to existing tables
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles    add column if not exists email    text;
alter table public.barbershops add column if not exists timezone text not null default 'America/New_York';

-- ─────────────────────────────────────────────────────────────────────────────
-- services — a shop's service menu with price + duration (supersedes the hardcoded
-- SERVICES list the web app shipped with).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.services (
  id            uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops (id) on delete cascade,
  name          text not null,
  price_cents   int  not null check (price_cents >= 0),
  duration_min  int  not null default 30 check (duration_min > 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists services_barbershop_id_idx on public.services (barbershop_id);

-- An appointment may point at the service row booked (nullable; book_slot still records
-- the human-readable label in appointments.service).
alter table public.appointments add column if not exists service_id uuid references public.services (id);

-- ─────────────────────────────────────────────────────────────────────────────
-- business_hours — one row per weekday per shop (day_of_week: 0 = Sunday .. 6 = Saturday).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.business_hours (
  id            uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops (id) on delete cascade,
  day_of_week   smallint not null check (day_of_week >= 0 and day_of_week <= 6),
  open_time     time not null,
  close_time    time not null,
  is_closed     boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (barbershop_id, day_of_week),
  check (close_time > open_time)
);
create index if not exists business_hours_barbershop_id_idx on public.business_hours (barbershop_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- reviews — a client rates a shop (1..5), optionally tied to one appointment.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id             uuid primary key default gen_random_uuid(),
  barbershop_id  uuid not null references public.barbershops (id) on delete cascade,
  client_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete set null,
  rating         smallint not null check (rating >= 1 and rating <= 5),
  comment        text,
  created_at     timestamptz not null default now(),
  unique (client_id, appointment_id)
);
create index if not exists reviews_barbershop_id_idx on public.reviews (barbershop_id);

-- barbershop_ratings — aggregate used by client search + shop pages.
create or replace view public.barbershop_ratings as
  select barbershop_id,
         round(avg(rating), 2) as avg_rating,
         count(*)::int          as review_count
  from public.reviews
  group by barbershop_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- notifications — in-app feed. Rows are written by the appointment trigger below,
-- never by clients directly (so there is no INSERT policy on purpose).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       text not null default 'general',
  title      text not null,
  body       text,
  related_id uuid,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_unread_idx on public.notifications (user_id, is_read);

-- ─────────────────────────────────────────────────────────────────────────────
-- Functions / triggers
-- ─────────────────────────────────────────────────────────────────────────────

-- signup trigger now also copies the auth email onto the profile row.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name, phone, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'client'),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- shop_open_now(): is the shop open right now, per its weekday hours in its own timezone.
create or replace function public.shop_open_now(shop_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.business_hours bh
    join public.barbershops b on b.id = bh.barbershop_id
    where bh.barbershop_id = shop_id
      and bh.is_closed = false
      and bh.day_of_week = extract(dow from (now() at time zone b.timezone))::smallint
      and (now() at time zone b.timezone)::time between bh.open_time and bh.close_time
  );
$$;

-- notify_on_appointment(): on a new booking, drop a notification for the barber and the client.
create or replace function public.notify_on_appointment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid; v_shop text; v_tz text; v_when timestamptz; v_when_txt text;
begin
  select owner_id, shop_name, coalesce(timezone, 'America/New_York')
    into v_owner, v_shop, v_tz
  from public.barbershops where id = NEW.barbershop_id;

  select starts_at into v_when from public.availability_slots where id = NEW.slot_id;
  if v_when is not null then
    v_when_txt := to_char(v_when at time zone v_tz, 'Mon DD, HH12:MI AM');
  end if;

  if v_owner is not null then
    insert into public.notifications (user_id, type, title, body, related_id)
    values (v_owner, 'booking', 'New booking',
            coalesce(NEW.service, 'Appointment')
              || case when v_when_txt is not null then ' · ' || v_when_txt else '' end,
            NEW.id);
  end if;

  if NEW.client_id is not null then
    insert into public.notifications (user_id, type, title, body, related_id)
    values (NEW.client_id, 'booking', 'Appointment confirmed',
            'Your ' || coalesce(NEW.service, 'appointment') || ' at ' || coalesce(v_shop, 'the shop')
              || case when v_when_txt is not null then ' on ' || v_when_txt else '' end || ' is confirmed.',
            NEW.id);
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_notify_on_appointment on public.appointments;
create trigger trg_notify_on_appointment
  after insert on public.appointments
  for each row execute function public.notify_on_appointment();

-- rls_auto_enable(): event trigger that force-enables RLS on any newly created public
-- table, so a forgotten `enable row level security` can never silently expose data.
create or replace function public.rls_auto_enable()
returns event_trigger language plpgsql security definer set search_path = pg_catalog as $$
declare cmd record;
begin
  for cmd in
    select * from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name = 'public' then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
      exception when others then
        raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
    end if;
  end loop;
end;
$$;

drop event trigger if exists ensure_rls;
create event trigger ensure_rls on ddl_command_end execute function public.rls_auto_enable();

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security for the new tables (same shape as 0001's policies).
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.services       enable row level security;
alter table public.business_hours enable row level security;
alter table public.reviews        enable row level security;
alter table public.notifications  enable row level security;

-- services: readable on active shops (or by the owner/admin); only the owner writes.
drop policy if exists services_select on public.services;
create policy services_select on public.services for select using (
  public.shop_is_active(barbershop_id) or public.owns_shop(barbershop_id) or public.is_admin()
);
drop policy if exists services_insert on public.services;
create policy services_insert on public.services for insert with check (public.owns_shop(barbershop_id));
drop policy if exists services_update on public.services;
create policy services_update on public.services for update
  using (public.owns_shop(barbershop_id)) with check (public.owns_shop(barbershop_id));
drop policy if exists services_delete on public.services;
create policy services_delete on public.services for delete using (public.owns_shop(barbershop_id));

-- business_hours: same visibility / ownership rules as services.
drop policy if exists hours_select on public.business_hours;
create policy hours_select on public.business_hours for select using (
  public.shop_is_active(barbershop_id) or public.owns_shop(barbershop_id) or public.is_admin()
);
drop policy if exists hours_insert on public.business_hours;
create policy hours_insert on public.business_hours for insert with check (public.owns_shop(barbershop_id));
drop policy if exists hours_update on public.business_hours;
create policy hours_update on public.business_hours for update
  using (public.owns_shop(barbershop_id)) with check (public.owns_shop(barbershop_id));
drop policy if exists hours_delete on public.business_hours;
create policy hours_delete on public.business_hours for delete using (public.owns_shop(barbershop_id));

-- reviews: readable on active shops (or owner/admin); a client writes/edits/deletes only their own.
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews for select using (
  public.shop_is_active(barbershop_id) or public.owns_shop(barbershop_id) or public.is_admin()
);
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert with check (client_id = auth.uid());
drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews for update
  using (client_id = auth.uid()) with check (client_id = auth.uid());
drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews for delete using (client_id = auth.uid() or public.is_admin());

-- notifications: a user reads / updates / deletes only their own. Inserts come only from
-- the SECURITY DEFINER trigger above, so there is intentionally no INSERT policy.
drop policy if exists notif_select_own on public.notifications;
create policy notif_select_own on public.notifications for select using (user_id = auth.uid());
drop policy if exists notif_update_own on public.notifications;
create policy notif_update_own on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notif_delete_own on public.notifications;
create policy notif_delete_own on public.notifications for delete using (user_id = auth.uid());

-- PostgREST reaches these as the `authenticated` role; RLS still gates every row.
grant select, insert, update, delete
  on public.services, public.business_hours, public.reviews, public.notifications
  to authenticated;
grant select on public.barbershop_ratings to authenticated;
