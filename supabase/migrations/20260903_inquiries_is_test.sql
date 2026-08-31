-- Mark internal QA submissions so they never count as a client's demand signal.
-- A flag rather than a delete: the record that the form was exercised and passed
-- is real evidence, it just is not the studio owner's evidence.

alter table public.inquiries
  add column if not exists is_test boolean not null default false;

update public.inquiries set is_test = true
 where lower(email) in ('avinnilooban@gmail.com', 'avinnilooban@outlook.com');

create index if not exists inquiries_not_test_idx
  on public.inquiries (created_at desc) where is_test = false;
