create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 160),
  title text not null check (char_length(title) between 1 and 240),
  excerpt text not null default '' check (char_length(excerpt) <= 600),
  body text not null default '' check (char_length(body) <= 50000),
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_published_idx on public.blog_posts (is_published, published_at desc, created_at desc);
grant select on public.blog_posts to anon, authenticated;
grant insert, update, delete on public.blog_posts to authenticated;
alter table public.blog_posts enable row level security;

create or replace function public.is_blog_editor()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'admin', 'developer')
  );
$$;

create or replace function public.is_blog_publisher()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'admin', 'developer', 'staff')
  );
$$;

create or replace function public.set_blog_published(p_id uuid, p_is_published boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_blog_publisher() then return false; end if;
  update public.blog_posts
  set is_published = p_is_published,
      published_at = case when p_is_published then coalesce(published_at, now()) else published_at end
  where id = p_id;
  return found;
end;
$$;

drop policy if exists blog_posts_public_select on public.blog_posts;
create policy blog_posts_public_select on public.blog_posts
  for select using (is_published or public.is_blog_publisher());
drop policy if exists blog_posts_admin_insert on public.blog_posts;
create policy blog_posts_admin_insert on public.blog_posts
  for insert with check (public.is_blog_editor());
drop policy if exists blog_posts_admin_update on public.blog_posts;
create policy blog_posts_admin_update on public.blog_posts
  for update using (public.is_blog_editor()) with check (public.is_blog_editor());
drop policy if exists blog_posts_admin_delete on public.blog_posts;
create policy blog_posts_admin_delete on public.blog_posts
  for delete using (public.is_blog_editor());

create or replace function public.touch_blog_posts()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists blog_posts_touch on public.blog_posts;
create trigger blog_posts_touch before update on public.blog_posts
  for each row execute function public.touch_blog_posts();

revoke all on function public.is_blog_editor() from public;
revoke all on function public.is_blog_publisher() from public;
revoke all on function public.set_blog_published(uuid, boolean) from public;
grant execute on function public.is_blog_editor() to authenticated;
grant execute on function public.is_blog_publisher() to authenticated;
grant execute on function public.set_blog_published(uuid, boolean) to authenticated;
