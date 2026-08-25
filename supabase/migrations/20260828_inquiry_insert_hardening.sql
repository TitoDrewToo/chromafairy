-- Inquiries: close the public insert path.
-- All writes now go through submitInquiry (server action, service role),
-- which owns validation, the honeypot and rate limiting.

drop policy if exists p_inq_insert on public.inquiries;

revoke insert, update, delete, truncate on public.inquiries from anon;
revoke insert, update, delete, truncate on public.inquiries from authenticated;

-- Refuse to install the constraints if existing rows violate the app limits.
do $$
declare
  violating_rows integer;
begin
  select count(*) into violating_rows
  from public.inquiries
  where char_length(name) > 100
     or char_length(email) > 254
     or char_length(message) > 3000;

  if violating_rows > 0 then
    raise exception 'inquiries contains % rows that violate the new length constraints', violating_rows;
  end if;
end;
$$;

alter table public.inquiries
  add constraint inquiries_name_len    check (char_length(name)    <= 100),
  add constraint inquiries_email_len   check (char_length(email)   <= 254),
  add constraint inquiries_message_len check (char_length(message) <= 3000);
