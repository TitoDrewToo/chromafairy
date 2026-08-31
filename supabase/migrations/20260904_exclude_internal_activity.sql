-- Internal activity must never count as a client's signal.
--
-- Two flags, same principle, both non-destructive:
--   inquiries.is_test      — our own QA submissions
--   page_views.is_internal — our own browsing of the site
--
-- A flag rather than a delete: the rows are evidence the forms and the tracker
-- work end to end. That evidence is real, it just is not the client's.

alter table public.page_views
  add column if not exists is_internal boolean not null default false;

create index if not exists page_views_external_idx
  on public.page_views (created_at desc) where is_internal = false;

-- Every reporting function filters the flags. Coverage does too: otherwise the
-- tracking-start gate would be satisfied by rows excluded from every figure.

create or replace function public.get_tracking_started_at()
returns timestamptz
language sql stable security definer set search_path = public
as $$ select min(created_at) from public.page_views where is_internal = false; $$;

create or replace function public.get_traffic_summary(p_from timestamptz, p_to timestamptz)
returns table(total_views bigint, unique_visitors_today bigint, top_referrer text, tracked_days bigint)
language sql stable security definer set search_path to 'public'
as $function$
  with window_rows as (
    select * from public.page_views
    where created_at >= p_from and created_at < p_to and is_internal = false
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
      where is_internal = false
        and created_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'
        and created_at < date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' + interval '1 day'),
    (select referrer from referrers),
    (select count(distinct (created_at at time zone 'UTC')::date) from window_rows);
$function$;

create or replace function public.get_views_by_period(p_granularity text, p_from timestamptz, p_to timestamptz)
returns table(period_start date, views bigint, unique_visitors bigint)
language plpgsql stable security definer set search_path to 'public'
as $function$
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
    where created_at >= p_from and created_at < p_to and is_internal = false
    group by 1
    order by 1;
end;
$function$;

create or replace function public.get_top_pages(p_from timestamptz, p_to timestamptz, p_limit integer default 10)
returns table(path text, views bigint)
language sql stable security definer set search_path to 'public'
as $function$
  with page_counts as (
    select page_views.path, count(*)::bigint as views
    from public.page_views
    where created_at >= p_from and created_at < p_to and is_internal = false
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
$function$;

create or replace function public.get_inquiry_total(p_from timestamptz, p_to timestamptz)
returns bigint
language sql stable security definer set search_path to 'public'
as $function$
  select count(*)::bigint
  from public.inquiries
  where created_at >= p_from and created_at < p_to and is_test = false;
$function$;

create or replace function public.get_inquiry_counts_by_period(p_granularity text, p_from timestamptz, p_to timestamptz)
returns table(period_start date, inquiries bigint)
language plpgsql stable security definer set search_path to 'public'
as $function$
begin
  if p_granularity not in ('day', 'week', 'month') then
    raise exception 'Invalid inquiry granularity';
  end if;

  return query
    select
      date_trunc(p_granularity, created_at at time zone 'UTC')::date,
      count(*)::bigint
    from public.inquiries
    where created_at >= p_from and created_at < p_to and is_test = false
    group by 1
    order by 1;
end;
$function$;

-- The three artwork functions carry the same filter.
create or replace function public.get_top_artworks(
  p_from timestamptz, p_to timestamptz, p_limit integer default 8
)
returns table (
  work_id uuid, slug text, title text, status text, primary_image text,
  views bigint, unique_viewers bigint, prev_views bigint
)
language sql stable security definer set search_path = public
as $$
  with bounded as (
    select greatest(1, least(coalesce(p_limit, 8), 50)) as lim, (p_to - p_from) as span
  ),
  current_window as (
    select public.shop_slug_from_path(pv.path) as slug,
           count(*) as views, count(distinct pv.visitor_hash) as unique_viewers
    from public.page_views pv
    where pv.path like '/shop/%' and pv.is_internal = false
      and pv.created_at >= p_from and pv.created_at < p_to
      and public.shop_slug_from_path(pv.path) is not null
    group by 1
  ),
  prior_window as (
    select public.shop_slug_from_path(pv.path) as slug, count(*) as views
    from public.page_views pv, bounded b
    where pv.path like '/shop/%' and pv.is_internal = false
      and pv.created_at >= p_from - b.span and pv.created_at < p_from
      and public.shop_slug_from_path(pv.path) is not null
    group by 1
  )
  select w.id, c.slug, coalesce(w.title, c.slug) as title, w.status::text,
         w.primary_image, c.views, c.unique_viewers, coalesce(p.views, 0)
  from current_window c
  left join public.works w on w.slug = c.slug
  left join prior_window p on p.slug = c.slug
  order by c.views desc, 3 asc
  limit (select lim from bounded);
$$;

create or replace function public.get_artwork_views_by_period(
  p_granularity text, p_from timestamptz, p_to timestamptz, p_slug text default null
)
returns table (period timestamptz, views bigint, unique_viewers bigint)
language sql stable security definer set search_path = public
as $$
  select date_trunc(
           case p_granularity when 'day' then 'day' when 'week' then 'week'
                when 'month' then 'month' end, pv.created_at) as period,
         count(*) as views,
         case when p_granularity = 'day'
              then count(distinct pv.visitor_hash) else null end
  from public.page_views pv
  where p_granularity in ('day', 'week', 'month')
    and pv.path like '/shop/%' and pv.is_internal = false
    and pv.created_at >= p_from and pv.created_at < p_to
    and public.shop_slug_from_path(pv.path) is not null
    and (p_slug is null or public.shop_slug_from_path(pv.path) = p_slug)
  group by 1
  order by 1;
$$;

create or replace function public.get_artwork_attention_summary(
  p_from timestamptz, p_to timestamptz
)
returns table (
  pieces_viewed bigint, piece_views bigint, piece_unique_viewers bigint, views_per_piece numeric
)
language sql stable security definer set search_path = public
as $$
  select count(distinct public.shop_slug_from_path(pv.path)),
         count(*),
         count(distinct pv.visitor_hash),
         round(count(*)::numeric
               / nullif(count(distinct public.shop_slug_from_path(pv.path)), 0), 1)
  from public.page_views pv
  where pv.path like '/shop/%' and pv.is_internal = false
    and pv.created_at >= p_from and pv.created_at < p_to
    and public.shop_slug_from_path(pv.path) is not null;
$$;
