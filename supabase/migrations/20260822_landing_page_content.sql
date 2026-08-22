-- Editable public landing-page content. The page template remains in code;
-- this stores only approved copy, ordered entries, and image references.
create table if not exists public.landing_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique check (section_key in ('collections', 'exhibitions', 'press', 'gallery')),
  eyebrow text not null default '' check (char_length(eyebrow) <= 160),
  title text not null default '' check (char_length(title) <= 240),
  body text not null default '' check (char_length(body) <= 4000),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.landing_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.landing_sections(id) on delete cascade,
  item_type text not null default 'entry' check (item_type in ('collection', 'exhibition', 'press_image', 'press_text', 'gallery')),
  eyebrow text not null default '' check (char_length(eyebrow) <= 160),
  title text not null default '' check (char_length(title) <= 240),
  subtitle text not null default '' check (char_length(subtitle) <= 500),
  body text not null default '' check (char_length(body) <= 4000),
  source text not null default '' check (char_length(source) <= 240),
  link_url text not null default '' check (char_length(link_url) <= 1000),
  link_label text not null default '' check (char_length(link_label) <= 240),
  media jsonb not null default '[]'::jsonb check (jsonb_typeof(media) = 'array'),
  display_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists landing_items_section_order_idx on public.landing_items (section_id, display_order, created_at);
grant select on public.landing_sections, public.landing_items to anon, authenticated;
grant insert, update, delete on public.landing_sections, public.landing_items to authenticated;
alter table public.landing_sections enable row level security;
alter table public.landing_items enable row level security;

drop policy if exists landing_sections_public_select on public.landing_sections;
create policy landing_sections_public_select on public.landing_sections
  for select using (is_published or public.is_admin());
drop policy if exists landing_sections_admin_insert on public.landing_sections;
create policy landing_sections_admin_insert on public.landing_sections
  for insert with check (public.is_admin());
drop policy if exists landing_sections_admin_update on public.landing_sections;
create policy landing_sections_admin_update on public.landing_sections
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists landing_sections_admin_delete on public.landing_sections;
create policy landing_sections_admin_delete on public.landing_sections
  for delete using (public.is_admin());

drop policy if exists landing_items_public_select on public.landing_items;
create policy landing_items_public_select on public.landing_items
  for select using (
    public.is_admin()
    or (is_published and exists (
      select 1 from public.landing_sections s
      where s.id = section_id and s.is_published
    ))
  );
drop policy if exists landing_items_admin_insert on public.landing_items;
create policy landing_items_admin_insert on public.landing_items
  for insert with check (public.is_admin());
drop policy if exists landing_items_admin_update on public.landing_items;
create policy landing_items_admin_update on public.landing_items
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists landing_items_admin_delete on public.landing_items;
create policy landing_items_admin_delete on public.landing_items
  for delete using (public.is_admin());

create or replace function public.touch_landing_content()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists landing_sections_touch on public.landing_sections;
create trigger landing_sections_touch before update on public.landing_sections
  for each row execute function public.touch_landing_content();
drop trigger if exists landing_items_touch on public.landing_items;
create trigger landing_items_touch before update on public.landing_items
  for each row execute function public.touch_landing_content();

insert into public.landing_sections (id, section_key, eyebrow, title, body)
values
  ('10000000-0000-4000-8000-000000000001', 'collections', 'Portfolio · Works', 'Eternal Flow', 'The artist''s reverence for water shows in her series entitled "Eternal Flow." Water has always been the universal symbol for life. By creating water-themed paintings, she captures vitality and life itself, and aims to bring this energy out into the world — one painting at a time.'),
  ('10000000-0000-4000-8000-000000000002', 'exhibitions', 'Exhibitions', 'On View', ''),
  ('10000000-0000-4000-8000-000000000003', 'gallery', 'Gallery · Seen in Situ', 'Other Works', 'Her pieces, in the spaces they now call home.'),
  ('10000000-0000-4000-8000-000000000004', 'press', 'Events & Features', 'In Print & On View', '')
on conflict (section_key) do nothing;

insert into public.landing_items (id, section_id, item_type, title, media, display_order)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'collection', 'Eternal Flow', '[{"path":"/assets/sel-flowL.jpg","alt":"Eternal Flow","label":"Eternal Flow I"},{"path":"/assets/sel-flowC.jpg","alt":"Eternal Flow","label":"Eternal Flow II"},{"path":"/assets/sel-flowR.jpg","alt":"Eternal Flow","label":"Eternal Flow III"}]'::jsonb, 0),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'exhibition', 'Waves of Being', '[]'::jsonb, 0),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'exhibition', 'Siargao', '[]'::jsonb, 1),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000003', 'gallery', 'In a Living Room', '[{"path":"/assets/sel-roomGrey.jpg","alt":"Eternal Flow in a living room","label":"In a Living Room"}]'::jsonb, 0),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000003', 'gallery', 'A Commission at Home', '[{"path":"/assets/sel-roomBaby.jpg","alt":"A commissioned piece at home","label":"A Commission at Home"}]'::jsonb, 1),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000003', 'gallery', 'In a Lounge', '[{"path":"/assets/sel-roomRed.jpg","alt":"A piece in a lounge","label":"In a Lounge"}]'::jsonb, 2),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000004', 'press_image', 'Asian Development Outlook 2024', '[]'::jsonb, 0),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000004', 'press_image', 'Xavier Artfest', '[]'::jsonb, 1),
  ('20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000004', 'press_image', 'The Weigh+', '[]'::jsonb, 2),
  ('20000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000004', 'press_text', 'ADB · Feature', '[]'::jsonb, 3),
  ('20000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000004', 'press_text', 'Exhibition', '[]'::jsonb, 4),
  ('20000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000004', 'press_text', 'Bacolod City · 2025', '[]'::jsonb, 5)
on conflict (id) do nothing;

update public.landing_items set
  eyebrow = 'Solo Exhibit',
  subtitle = 'Charlie''s Art Gallery @ Galeria Lienzo\nItalia Restaurant · Bacolod City · June 15, 2025',
  body = 'Her solo exhibit — a body of ocean-drawn work, deep teals and marbled whites, presented together.',
  media = '[{"path":"/assets/sel-exhibitA.jpg","alt":"Waves of Being — gallery installation","label":"Galeria Lienzo · Bacolod City"}]'::jsonb
where id = '20000000-0000-4000-8000-000000000002';
update public.landing_items set
  eyebrow = 'Installation',
  subtitle = 'Open-air panels · among the palms',
  body = 'Fluid panels set against tropical light — the paintings meeting the sea and sky that inspired them.',
  media = '[{"path":"/assets/sel-siargao.jpg","alt":"Open-air installation, Siargao","label":"Open-air · Siargao"}]'::jsonb
where id = '20000000-0000-4000-8000-000000000003';
update public.landing_items set
  body = 'Cover artwork for the Asian Development Outlook 2024.',
  source = 'Asian Development Bank',
  media = '[{"path":"/assets/adb-outlook-cover.jpeg","alt":"Asian Development Outlook April 2024 featuring Samantha Ty''s artwork","label":"Open cover artwork"}]'::jsonb,
  link_url = 'https://www.linkedin.com/pulse/adb-raises-developing-asia-pacifics-economic-growth-vdj5c/',
  link_label = 'Open feature'
where id = '20000000-0000-4000-8000-000000000007';
update public.landing_items set
  eyebrow = '2024 · Group exhibition', body = 'Exhibited at Xavier Artfest 2024.', source = 'Group Exhibition',
  link_url = 'https://www.instagram.com/xsartfest/', link_label = 'Open Instagram profile'
where id = '20000000-0000-4000-8000-000000000008';
update public.landing_items set
  eyebrow = 'Featured artist', body = 'Featured artist, The Weigh+.', source = 'Jan–March 2024',
  link_url = 'https://www.instagram.com/p/C2UME2Voc8K/', link_label = 'Open Instagram feature'
where id = '20000000-0000-4000-8000-000000000009';
update public.landing_items set
  body = 'Featured in the Asian Development Bank''s LinkedIn newsletter.',
  link_url = 'https://www.linkedin.com/pulse/adb-raises-developing-asia-pacifics-economic-growth-vdj5c/', link_label = 'Read the feature'
where id = '20000000-0000-4000-8000-000000000010';
update public.landing_items set body = '"Philippine''s Finest" at the House of Representatives.', source = 'Exhibition'
where id = '20000000-0000-4000-8000-000000000011';
update public.landing_items set body = 'Waves of Being — solo exhibit, Charlie''s Art Gallery.', link_url = 'https://charliesartgallery.com/exhibit/waves-of-being-samantha-ty/', link_label = 'View the exhibit'
where id = '20000000-0000-4000-8000-000000000012';
