-- Keep inquiries stored for the studio record while allowing the inbox to be cleared.
alter table public.inquiries add column if not exists archived_at timestamptz;

create index if not exists inquiries_active_created_at_idx
  on public.inquiries (created_at desc)
  where archived_at is null;
