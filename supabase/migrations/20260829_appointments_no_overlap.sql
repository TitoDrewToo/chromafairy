-- Prevent overlapping non-cancelled appointments through every write path.
create extension if not exists btree_gist;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'appointments_no_overlap'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments
      add constraint appointments_no_overlap
      exclude using gist (
        tstzrange(starts_at, ends_at) with &&
      ) where (status <> 'cancelled');
  end if;
end;
$$;
