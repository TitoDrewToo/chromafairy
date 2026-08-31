-- Privacy-preserving studio insights. Rows older than 12 months should eventually
-- be pruned or rolled up as traffic volume grows.
create table public.page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  referrer text,
  visitor_hash text not null,
  created_at timestamptz not null default now()
);

create index page_views_created_idx on public.page_views (created_at desc);
create index page_views_path_created_idx on public.page_views (path, created_at desc);
create index page_views_visitor_day_idx on public.page_views (visitor_hash, created_at desc);

alter table public.page_views enable row level security;
revoke all on public.page_views from public, anon, authenticated;
grant all on public.page_views to service_role;

create or replace function public.get_traffic_summary(p_from timestamptz, p_to timestamptz)
returns table (
  total_views bigint,
  unique_visitors_today bigint,
  top_referrer text,
  tracked_days bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with window_rows as (
    select * from public.page_views where created_at >= p_from and created_at < p_to
  ),
  referrers as (
    select nullif(trim(referrer), '') as referrer, count(*) as count
    from window_rows
    where nullif(trim(referrer), '') is not null
    group by nullif(trim(referrer), '')
    order by count desc, referrer
    limit 1
  )
  select
    (select count(*) from window_rows),
    (select count(distinct visitor_hash) from public.page_views
      where created_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'
        and created_at < date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' + interval '1 day'),
    (select referrer from referrers),
    (select count(distinct (created_at at time zone 'UTC')::date) from window_rows);
$$;

create or replace function public.get_views_by_period(
  p_granularity text,
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  period_start date,
  views bigint,
  unique_visitors bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_granularity not in ('day', 'week', 'month') then
    raise exception 'Invalid traffic granularity';
  end if;

  return query
    select
      date_trunc(p_granularity, created_at at time zone 'UTC')::date,
      count(*)::bigint,
      case when p_granularity = 'day' then count(distinct visitor_hash)::bigint else null end
    from public.page_views
    where created_at >= p_from and created_at < p_to
    group by 1
    order by 1;
end;
$$;

create or replace function public.get_top_pages(
  p_from timestamptz,
  p_to timestamptz,
  p_limit int default 10
)
returns table (path text, views bigint)
language sql
stable
security definer
set search_path = public
as $$
  with page_counts as (
    select page_views.path, count(*)::bigint as views
    from public.page_views
    where created_at >= p_from and created_at < p_to
    group by page_views.path
  ),
  ranked as (
    select page_counts.*, row_number() over (order by views desc, path) as position
    from page_counts
  ),
  top_rows as (
    select ranked.path, ranked.views from ranked
    where ranked.position <= greatest(1, least(coalesce(p_limit, 10), 100))
  ),
  other_row as (
    select 'Other'::text as path, sum(ranked.views)::bigint as views
    from ranked
    where ranked.position > greatest(1, least(coalesce(p_limit, 10), 100))
    having count(*) > 0
  )
  select * from top_rows
  union all
  select * from other_row
  order by views desc, path;
$$;

create or replace function public.get_inquiry_counts_by_period(
  p_granularity text,
  p_from timestamptz,
  p_to timestamptz
)
returns table (period_start date, inquiries bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_granularity not in ('day', 'week', 'month') then
    raise exception 'Invalid inquiry granularity';
  end if;

  return query
    select
      date_trunc(p_granularity, created_at at time zone 'UTC')::date,
      count(*)::bigint
    from public.inquiries
    where created_at >= p_from and created_at < p_to
    group by 1
    order by 1;
end;
$$;

create or replace function public.get_inquiry_total(p_from timestamptz, p_to timestamptz)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.inquiries
  where created_at >= p_from and created_at < p_to;
$$;

revoke all on function public.get_traffic_summary(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.get_views_by_period(text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.get_top_pages(timestamptz, timestamptz, int) from public, anon, authenticated;
revoke all on function public.get_inquiry_counts_by_period(text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.get_traffic_summary(timestamptz, timestamptz) to service_role;
grant execute on function public.get_views_by_period(text, timestamptz, timestamptz) to service_role;
grant execute on function public.get_top_pages(timestamptz, timestamptz, int) to service_role;
grant execute on function public.get_inquiry_counts_by_period(text, timestamptz, timestamptz) to service_role;
revoke all on function public.get_inquiry_total(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.get_inquiry_total(timestamptz, timestamptz) to service_role;
