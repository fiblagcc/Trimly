-- Trimly — migration 0003: favorites.
--
-- Clients can save shops. The Android app kept favorites in on-device storage; the web
-- app stores them server-side so they follow the account across devices. Additive and
-- RLS-protected, so it does not affect the phone or desktop apps.

create table if not exists public.favorites (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  barbershop_id uuid not null references public.barbershops (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, barbershop_id)
);
create index if not exists favorites_user_idx on public.favorites (user_id);

alter table public.favorites enable row level security;

-- A user reads / adds / removes only their own favorites.
drop policy if exists favorites_select on public.favorites;
create policy favorites_select on public.favorites for select using (user_id = auth.uid());
drop policy if exists favorites_insert on public.favorites;
create policy favorites_insert on public.favorites for insert with check (user_id = auth.uid());
drop policy if exists favorites_delete on public.favorites;
create policy favorites_delete on public.favorites for delete using (user_id = auth.uid());

grant select, insert, delete on public.favorites to authenticated;
