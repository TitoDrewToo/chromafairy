-- Durable error capture and grouped diagnosis records.
-- Client roles can read only through the user-manager RLS policy; writes are service-role only.

create table if not exists public.error_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  occurred_at_manila timestamp generated always as (occurred_at at time zone 'Asia/Manila') stored,
  user_id uuid references auth.users(id) on delete set null,
  tool text not null,
  fn text not null,
  action text,
  route text,
  level text not null check (level in ('error', 'warn', 'info')),
  message text not null,
  stack text,
  fingerprint text not null,
  context jsonb not null default '{}'::jsonb,
  release text,
  environment text
);

create table if not exists public.error_groups (
  fingerprint text primary key,
  title text not null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  count integer not null default 1 check (count > 0),
  status text not null default 'new',
  ai_analysis text,
  proposed_fix text,
  risk_level text,
  confidence numeric,
  severity text,
  diagnosed_at timestamptz,
  ai_model text,
  review_verdict text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

create index if not exists error_events_fingerprint_idx on public.error_events (fingerprint);
create index if not exists error_events_occurred_at_idx on public.error_events (occurred_at desc);
create index if not exists error_events_user_id_idx on public.error_events (user_id);
create index if not exists error_groups_last_seen_idx on public.error_groups (last_seen desc);

alter table public.error_events enable row level security;
alter table public.error_groups enable row level security;

drop policy if exists error_events_manager_select on public.error_events;
create policy error_events_manager_select on public.error_events
  for select using (public.is_user_manager());

drop policy if exists error_groups_manager_select on public.error_groups;
create policy error_groups_manager_select on public.error_groups
  for select using (public.is_user_manager());

revoke all on public.error_events from anon, authenticated;
revoke all on public.error_groups from anon, authenticated;
grant select on public.error_events, public.error_groups to authenticated;

create or replace function public.record_error_event(
  p_occurred_at timestamptz default now(),
  p_user_id uuid default null,
  p_tool text default 'systems',
  p_fn text default 'unknown',
  p_action text default null,
  p_route text default null,
  p_level text default 'error',
  p_message text default 'Unknown error',
  p_stack text default null,
  p_fingerprint text default null,
  p_context jsonb default '{}'::jsonb,
  p_release text default null,
  p_environment text default null
) returns public.error_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.error_events;
  v_fingerprint text := nullif(trim(p_fingerprint), '');
begin
  if v_fingerprint is null then
    raise exception 'Error fingerprint is required';
  end if;
  if p_level not in ('error', 'warn', 'info') then
    raise exception 'Invalid error level';
  end if;

  insert into public.error_events (
    occurred_at, user_id, tool, fn, action, route, level, message, stack,
    fingerprint, context, release, environment
  ) values (
    coalesce(p_occurred_at, now()), p_user_id, left(coalesce(p_tool, 'systems'), 120),
    left(coalesce(p_fn, 'unknown'), 160), left(p_action, 160), left(p_route, 500),
    p_level, left(coalesce(p_message, 'Unknown error'), 4000), left(p_stack, 12000),
    left(v_fingerprint, 128), coalesce(p_context, '{}'::jsonb), left(p_release, 120),
    left(p_environment, 80)
  ) returning * into v_event;

  insert into public.error_groups (fingerprint, title, first_seen, last_seen, count)
  values (v_event.fingerprint, v_event.message, v_event.occurred_at, v_event.occurred_at, 1)
  on conflict (fingerprint) do update set
    title = case when public.error_groups.title = '' then excluded.title else public.error_groups.title end,
    last_seen = greatest(public.error_groups.last_seen, excluded.last_seen),
    count = public.error_groups.count + 1;

  return v_event;
end;
$$;

revoke all on function public.record_error_event(timestamptz, uuid, text, text, text, text, text, text, text, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.record_error_event(timestamptz, uuid, text, text, text, text, text, text, text, text, jsonb, text, text) to service_role;
