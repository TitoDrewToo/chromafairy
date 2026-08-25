-- Public UI may read feature state, but not operational notes.
drop policy if exists p_flags_public_read on public.feature_flags;
create policy p_flags_admin_read on public.feature_flags
  for select using (is_user_manager());

revoke select on public.feature_flags from anon, authenticated;

create or replace view public.public_feature_flags as
  select key, enabled
  from public.feature_flags;

grant select on public.public_feature_flags to anon, authenticated;
