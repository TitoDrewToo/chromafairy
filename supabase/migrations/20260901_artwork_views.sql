-- Per-artwork view intelligence.
-- No new collection: /shop/<slug> rows are already in page_views. This layer
-- resolves a path to a work and aggregates it, in Postgres, so the app never
-- pulls rows to count them.
--
-- Deleted or renamed works keep their raw rows; the resolver falls back to the
-- slug so history is never silently dropped.

-- Path -> slug. Immutable so it can be indexed.
create or replace function public.shop_slug_from_path(p_path text)
returns text
language sql
immutable
as $$
  select case
    when p_path like '/shop/%'
     and split_part(p_path, '/', 3) <> ''
     and split_part(p_path, '/', 4) = ''
    then split_part(p_path, '/', 3)
    else null
  end;
$$;

create index if not exists page_views_shop_slug_idx
  on public.page_views (public.shop_slug_from_path(path), created_at desc)
  where path like '/shop/%';

-- Ranked pieces for a window, with the previous equal window for deltas.
create or replace function public.get_top_artworks(
  p_from timestamptz,
  p_to timestamptz,
  p_limit integer default 8
)
returns table (
  work_id uuid,
  slug text,
  title text,
  status text,
  primary_image text,
  views bigint,
  unique_viewers bigint,
  prev_views bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with bounded as (
    select greatest(1, least(coalesce(p_limit, 8), 50)) as lim,
           (p_to - p_from) as span
  ),
  current_window as (
    select public.shop_slug_from_path(pv.path) as slug,
           count(*) as views,
           count(distinct pv.visitor_hash) as unique_viewers
    from public.page_views pv
    where pv.path like '/shop/%'
      and pv.created_at >= p_from and pv.created_at < p_to
      and public.shop_slug_from_path(pv.path) is not null
    group by 1
  ),
  prior_window as (
    select public.shop_slug_from_path(pv.path) as slug, count(*) as views
    from public.page_views pv, bounded b
    where pv.path like '/shop/%'
      and pv.created_at >= p_from - b.span and pv.created_at < p_from
      and public.shop_slug_from_path(pv.path) is not null
    group by 1
  )
  select w.id,
         c.slug,
         coalesce(w.title, c.slug) as title,
         w.status::text,
         w.primary_image,
         c.views,
         c.unique_viewers,
         coalesce(p.views, 0) as prev_views
  from current_window c
  left join public.works w on w.slug = c.slug
  left join prior_window p on p.slug = c.slug
  order by c.views desc, title asc
  limit (select lim from bounded);
$$;

-- One piece over time, for the monthly view and for a per-work detail panel.
create or replace function public.get_artwork_views_by_period(
  p_granularity text,
  p_from timestamptz,
  p_to timestamptz,
  p_slug text default null
)
returns table (
  period timestamptz,
  views bigint,
  unique_viewers bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select date_trunc(
           case p_granularity
             when 'day' then 'day'
             when 'week' then 'week'
             when 'month' then 'month'
           end, pv.created_at) as period,
         count(*) as views,
         case when p_granularity = 'day'
              then count(distinct pv.visitor_hash) else null end as unique_viewers
  from public.page_views pv
  where p_granularity in ('day', 'week', 'month')
    and pv.path like '/shop/%'
    and pv.created_at >= p_from and pv.created_at < p_to
    and public.shop_slug_from_path(pv.path) is not null
    and (p_slug is null or public.shop_slug_from_path(pv.path) = p_slug)
  group by 1
  order by 1;
$$;

-- Attention that never converted: the gap between looking and asking.
create or replace function public.get_artwork_attention_summary(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  pieces_viewed bigint,
  piece_views bigint,
  piece_unique_viewers bigint,
  views_per_piece numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct public.shop_slug_from_path(pv.path)) as pieces_viewed,
         count(*) as piece_views,
         count(distinct pv.visitor_hash) as piece_unique_viewers,
         round(count(*)::numeric
               / nullif(count(distinct public.shop_slug_from_path(pv.path)), 0), 1)
  from public.page_views pv
  where pv.path like '/shop/%'
    and pv.created_at >= p_from and pv.created_at < p_to
    and public.shop_slug_from_path(pv.path) is not null;
$$;

revoke all on function public.get_top_artworks(timestamptz, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.get_artwork_views_by_period(text, timestamptz, timestamptz, text) from public, anon, authenticated;
revoke all on function public.get_artwork_attention_summary(timestamptz, timestamptz) from public, anon, authenticated;

grant execute on function public.get_top_artworks(timestamptz, timestamptz, integer) to service_role;
grant execute on function public.get_artwork_views_by_period(text, timestamptz, timestamptz, text) to service_role;
grant execute on function public.get_artwork_attention_summary(timestamptz, timestamptz) to service_role;
