-- Team-board deletion is author-or-manager only.
alter table public.studio_board enable row level security;
drop policy if exists studio_board_delete on public.studio_board;
create policy studio_board_delete on public.studio_board
  for delete using (author_id = auth.uid() or public.is_user_manager());
