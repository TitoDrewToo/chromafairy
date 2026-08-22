-- Studio Notes: per-user notepad pages + a shared team board.
-- Personal notes are private to their owner. The board is shared across studio members.

-- ── Personal notepad pages ────────────────────────────────────────────────
create table if not exists public.studio_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null default 'Untitled' check (char_length(title) <= 120),
  body       text not null default ''          check (char_length(body)  <= 50000),
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists studio_notes_user_idx on public.studio_notes (user_id, position);
alter table public.studio_notes enable row level security;

drop policy if exists studio_notes_select on public.studio_notes;
create policy studio_notes_select on public.studio_notes
  for select using (user_id = auth.uid());
drop policy if exists studio_notes_insert on public.studio_notes;
create policy studio_notes_insert on public.studio_notes
  for insert with check (user_id = auth.uid());
drop policy if exists studio_notes_update on public.studio_notes;
create policy studio_notes_update on public.studio_notes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists studio_notes_delete on public.studio_notes;
create policy studio_notes_delete on public.studio_notes
  for delete using (user_id = auth.uid());

-- keep updated_at fresh so autosave timestamps are accurate
create or replace function public.touch_studio_notes()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists studio_notes_touch on public.studio_notes;
create trigger studio_notes_touch before update on public.studio_notes
  for each row execute function public.touch_studio_notes();

-- ── Shared team board (parked until there are teammates) ───────────────────
create table if not exists public.studio_board (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references auth.users(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index if not exists studio_board_created_idx on public.studio_board (created_at desc);
alter table public.studio_board enable row level security;

drop policy if exists studio_board_select on public.studio_board;
create policy studio_board_select on public.studio_board
  for select using (public.is_admin());
drop policy if exists studio_board_insert on public.studio_board;
create policy studio_board_insert on public.studio_board
  for insert with check (public.is_admin() and author_id = auth.uid());
drop policy if exists studio_board_delete on public.studio_board;
create policy studio_board_delete on public.studio_board
  for delete using (author_id = auth.uid() or public.is_user_manager());
