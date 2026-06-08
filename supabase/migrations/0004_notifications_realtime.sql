-- Trimly — migration 0004: stream notifications over Realtime.
--
-- Adds public.notifications to the supabase_realtime publication so the in-app bell
-- updates live, the same way the barber's incoming-bookings toast already does. RLS
-- still gates delivery: each connected user only receives their own notification rows
-- (notif_select_own: user_id = auth.uid()).

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
     )
  then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
