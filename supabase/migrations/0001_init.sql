-- Trimly — initial schema, signup trigger, and Row Level Security.
-- Source of truth: docs/SPEC.md §4 (data model) and §5 (RLS). Read §5 before editing.
-- Idempotent enough to re-run during development.

-- ─────────────────────────────────────────────────────────────────────────────
-- Tables (SPEC §4). Every table: uuid PK default gen_random_uuid(), created_at.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       text not null check (role in ('client', 'barber', 'admin')),
  full_name  text,
  phone      text,
  created_at timestamptz not null default now()
);

create table if not exists public.barbershops (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references public.profiles (id) on delete cascade,
  shop_name           text not null,
  bio                 text,
  zip                 text not null,
  address             text,
  latitude            double precision,
  longitude           double precision,
  is_active           boolean not null default false,                  -- the subscription gate
  subscription_status text not null default 'inactive'
                        check (subscription_status in ('active', 'inactive')),
  created_at          timestamptz not null default now()
);

create table if not exists public.availability_slots (
  id            uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops (id) on delete cascade,
  starts_at     timestamptz not null,
  duration_min  int not null default 30,
  is_booked     boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists public.appointments (
  id            uuid primary key default gen_random_uuid(),
  slot_id       uuid not null unique references public.availability_slots (id) on delete cascade,
  client_id     uuid not null references public.profiles (id) on delete cascade,
  barbershop_id uuid not null references public.barbershops (id) on delete cascade,
  service       text not null,
  status        text not null default 'confirmed'
                  check (status in ('confirmed', 'cancelled', 'completed')),
  created_at    timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id         uuid primary key default gen_random_uuid(),
  opened_by  uuid not null references public.profiles (id) on delete cascade,
  subject    text not null,
  body       text,
  status     text not null default 'open'
               check (status in ('open', 'in_progress', 'closed')),
  created_at timestamptz not null default now()
);

-- Helpful indexes for the queries the app actually runs.
create index if not exists barbershops_zip_active_idx on public.barbershops (zip, is_active);
create index if not exists barbershops_owner_idx       on public.barbershops (owner_id);
create index if not exists slots_shop_idx              on public.availability_slots (barbershop_id, starts_at);
create index if not exists appts_client_idx            on public.appointments (client_id);
create index if not exists appts_shop_idx              on public.appointments (barbershop_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Signup trigger: create a profiles row from auth signup metadata.
-- SECURITY DEFINER so it runs as owner and is not blocked by RLS.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'client'),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- is_admin(): used inside policies. SECURITY DEFINER reads profiles without RLS,
-- which avoids the infinite recursion you'd get from an admin policy that selects
-- profiles to check the role.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- owns_shop(): true if the current user owns the given barbershop. SECURITY DEFINER
-- so it can read barbershops regardless of that table's own policies.
create or replace function public.owns_shop(shop_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.barbershops where id = shop_id and owner_id = auth.uid()
  );
$$;

-- shop_is_active(): true if the given barbershop is active (for slot visibility).
create or replace function public.shop_is_active(shop_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.barbershops where id = shop_id and is_active = true
  );
$$;

-- barber_sees_client(): true if the current user is a barber who owns a shop the
-- given client has booked. SPEC §6 shows the booking client's NAME to the barber
-- (the realtime toast and the incoming-bookings list), so the barber must be able
-- to read that client's profile row — but ONLY for clients who booked them. This
-- does NOT let one client read another client's profile, so the cross-account
-- check still holds. SECURITY DEFINER avoids recursion back into profiles' policy.
create or replace function public.barber_sees_client(client_profile uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.appointments a
    join public.barbershops b on b.id = a.barbershop_id
    where a.client_id = client_profile and b.owner_id = auth.uid()
  );
$$;

-- book_slot(): atomically book an open slot. Locks the slot row (FOR UPDATE) so two
-- clients racing for the same slot can't both win — the second sees it already booked.
-- SECURITY DEFINER so it can flip the slot's is_booked (clients don't own slots), but
-- it always books for the CALLER (client_id = auth.uid()) and only on an active shop.
create or replace function public.book_slot(p_slot_id uuid, p_service text)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_slot public.availability_slots;
  v_shop public.barbershops;
  v_appt public.appointments;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_slot from public.availability_slots where id = p_slot_id for update;
  if not found then
    raise exception 'slot not found';
  end if;
  if v_slot.is_booked then
    raise exception 'slot already booked' using errcode = 'P0001';
  end if;
  if v_slot.starts_at <= now() then
    raise exception 'slot is in the past';
  end if;

  select * into v_shop from public.barbershops where id = v_slot.barbershop_id;
  if not found or not v_shop.is_active then
    raise exception 'shop not available';
  end if;

  insert into public.appointments (slot_id, client_id, barbershop_id, service)
  values (p_slot_id, v_uid, v_slot.barbershop_id, coalesce(nullif(p_service, ''), 'Haircut'))
  returning * into v_appt;

  update public.availability_slots set is_booked = true where id = p_slot_id;

  return v_appt;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security (SPEC §5). RLS ON for EVERY table. Never world-readable.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles          enable row level security;
alter table public.barbershops       enable row level security;
alter table public.availability_slots enable row level security;
alter table public.appointments      enable row level security;
alter table public.support_tickets   enable row level security;

-- profiles ────────────────────────────────────────────────
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or public.is_admin()
    or public.barber_sees_client(id)   -- a barber may read profiles of clients who booked them
  );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- barbershops ─────────────────────────────────────────────
-- anyone authenticated reads ACTIVE shops; owners read their own; admins read all.
drop policy if exists barbershops_select on public.barbershops;
create policy barbershops_select on public.barbershops
  for select using (
    is_active = true or owner_id = auth.uid() or public.is_admin()
  );

drop policy if exists barbershops_insert on public.barbershops;
create policy barbershops_insert on public.barbershops
  for insert with check (owner_id = auth.uid());

-- owner can update their own; admin can update any (e.g. toggle active).
drop policy if exists barbershops_update on public.barbershops;
create policy barbershops_update on public.barbershops
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- availability_slots ──────────────────────────────────────
-- read slots of active shops; owner reads own; admin all.
drop policy if exists slots_select on public.availability_slots;
create policy slots_select on public.availability_slots
  for select using (
    public.shop_is_active(barbershop_id) or public.owns_shop(barbershop_id) or public.is_admin()
  );

-- only the owning barber writes slots.
drop policy if exists slots_insert on public.availability_slots;
create policy slots_insert on public.availability_slots
  for insert with check (public.owns_shop(barbershop_id));

drop policy if exists slots_update on public.availability_slots;
create policy slots_update on public.availability_slots
  for update using (public.owns_shop(barbershop_id))
  with check (public.owns_shop(barbershop_id));

drop policy if exists slots_delete on public.availability_slots;
create policy slots_delete on public.availability_slots
  for delete using (public.owns_shop(barbershop_id));

-- appointments ────────────────────────────────────────────
-- the client who booked, the barber who owns the shop, or admin can read.
drop policy if exists appts_select on public.appointments;
create policy appts_select on public.appointments
  for select using (
    client_id = auth.uid() or public.owns_shop(barbershop_id) or public.is_admin()
  );

-- a client inserts their own appointment only.
drop policy if exists appts_insert on public.appointments;
create policy appts_insert on public.appointments
  for insert with check (client_id = auth.uid());

-- cancel/update: the owning client or the shop's barber.
drop policy if exists appts_update on public.appointments;
create policy appts_update on public.appointments
  for update using (client_id = auth.uid() or public.owns_shop(barbershop_id))
  with check (client_id = auth.uid() or public.owns_shop(barbershop_id));

-- support_tickets ─────────────────────────────────────────
drop policy if exists tickets_select on public.support_tickets;
create policy tickets_select on public.support_tickets
  for select using (opened_by = auth.uid() or public.is_admin());

drop policy if exists tickets_insert on public.support_tickets;
create policy tickets_insert on public.support_tickets
  for insert with check (opened_by = auth.uid());

drop policy if exists tickets_update on public.support_tickets;
create policy tickets_update on public.support_tickets
  for update using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- Grants: PostgREST reaches tables as the `authenticated` role (logged-in users).
-- RLS still gates every row. `anon` (logged out) gets nothing in public on purpose.
-- ─────────────────────────────────────────────────────────────────────────────

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Realtime: the barber dashboard subscribes to new appointments (Step 6).
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public' and tablename = 'appointments'
     )
  then
    alter publication supabase_realtime add table public.appointments;
  end if;
end $$;
