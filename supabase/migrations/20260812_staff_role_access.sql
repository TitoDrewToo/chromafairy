-- Staff is a Studio member with access to Catalogue, Inquiries, Sales/Orders,
-- Customers, and Scheduling only. User management, Insights, Settings, and
-- Systems remain restricted to owner/developer/admin via is_user_manager().

alter type public.user_role add value if not exists 'staff';

create or replace function public.is_admin() returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('owner', 'admin', 'developer', 'staff')
  );
$$;

create or replace function public.is_user_manager() returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('owner', 'developer', 'admin')
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.is_user_manager() from public;
grant execute on function public.is_user_manager() to authenticated;
