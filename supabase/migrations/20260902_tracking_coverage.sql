-- Coverage source for the insights page.
-- A metric may only be displayed over a window its own data covers; this
-- function is how the app knows where that window begins.

create or replace function public.get_tracking_started_at()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$ select min(created_at) from public.page_views; $$;

revoke all on function public.get_tracking_started_at() from public, anon, authenticated;
grant execute on function public.get_tracking_started_at() to service_role;
