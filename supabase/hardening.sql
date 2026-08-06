-- Chroma Fairy pre-launch hardening. Run after schema.sql in Supabase.

alter table public.orders
  add column if not exists work_status_before_sale public.work_status;

create or replace function public.is_owner_or_developer() returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'developer')
  );
$$;
revoke all on function public.is_owner_or_developer() from public;
grant execute on function public.is_owner_or_developer() to authenticated;

create or replace function public.is_user_manager() returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'developer', 'admin')
  );
$$;
revoke all on function public.is_user_manager() from public;
grant execute on function public.is_user_manager() to authenticated;

drop policy if exists p_profiles_admin on public.profiles;
create policy p_profiles_admin_read on public.profiles for select using (is_admin());
create policy p_profiles_admin_write on public.profiles for update using (is_user_manager()) with check (is_user_manager());

drop policy if exists p_flags_admin on public.feature_flags;
create policy p_flags_admin_write on public.feature_flags for insert with check (is_owner_or_developer());
create policy p_flags_admin_update on public.feature_flags for update using (is_owner_or_developer()) with check (is_owner_or_developer());
create policy p_flags_admin_delete on public.feature_flags for delete using (is_owner_or_developer());

create or replace function public.record_sale(
  p_customer_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_work_id uuid,
  p_inquiry_id uuid,
  p_amount numeric,
  p_currency text,
  p_sale_date date,
  p_channel text,
  p_notes text,
  p_shipment jsonb default null
) returns jsonb
  language plpgsql security invoker set search_path = public as $$
declare
  v_customer_id uuid := p_customer_id;
  v_order_id uuid := gen_random_uuid();
  v_work_status public.work_status;
begin
  if not is_admin() then raise exception 'Not authorized.' using errcode = '42501'; end if;
  select status into v_work_status from public.works where id = p_work_id for update;
  if v_work_status is null or v_work_status not in ('available', 'reserved') then
    raise exception 'Work is not available for sale.' using errcode = 'P0001';
  end if;

  if v_customer_id is not null then
    perform 1 from public.customers where id = v_customer_id for update;
    if not found then raise exception 'Customer not found.'; end if;
    update public.customers set name = p_customer_name, email = lower(trim(p_customer_email)), phone = nullif(trim(p_customer_phone), '') where id = v_customer_id;
  else
    select id into v_customer_id from public.customers where lower(email) = lower(trim(p_customer_email)) for update;
    if v_customer_id is null then
      insert into public.customers (name, email, phone) values (p_customer_name, lower(trim(p_customer_email)), nullif(trim(p_customer_phone), '')) returning id into v_customer_id;
    else
      update public.customers set name = p_customer_name, phone = nullif(trim(p_customer_phone), '') where id = v_customer_id;
    end if;
  end if;

  insert into public.orders (id, work_id, inquiry_id, customer_id, buyer_name, buyer_email, buyer_phone, amount, currency, payment_status, payment_provider, order_status, sale_date, channel, notes, work_status_before_sale)
  values (v_order_id, p_work_id, p_inquiry_id, v_customer_id, p_customer_name, lower(trim(p_customer_email)), nullif(trim(p_customer_phone), ''), p_amount, p_currency, 'paid', 'manual', 'paid', p_sale_date, p_channel, p_notes, v_work_status);

  update public.works set status = 'sold', sold_at = now() where id = p_work_id;

  if p_shipment is not null and (nullif(p_shipment->>'carrier', '') is not null or nullif(p_shipment->>'trackingNumber', '') is not null) then
    insert into public.shipments (id, order_id, carrier, tracking_number, package_type, status)
    values (gen_random_uuid(), v_order_id, nullif(p_shipment->>'carrier', ''), nullif(p_shipment->>'trackingNumber', ''), (p_shipment->>'packageType')::public.package_type, 'pending');
  end if;
  return jsonb_build_object('order_id', v_order_id, 'customer_id', v_customer_id);
end;
$$;
revoke all on function public.record_sale(uuid, text, text, text, uuid, uuid, numeric, text, date, text, text, jsonb) from public;
grant execute on function public.record_sale(uuid, text, text, text, uuid, uuid, numeric, text, date, text, text, jsonb) to authenticated;

create or replace function public.cancel_order(p_order_id uuid) returns boolean
  language plpgsql security invoker set search_path = public as $$
declare
  v_work_id uuid;
  v_previous_status public.work_status;
  v_order_status public.order_status;
begin
  if not is_admin() then raise exception 'Not authorized.' using errcode = '42501'; end if;
  select work_id, work_status_before_sale, order_status into v_work_id, v_previous_status, v_order_status from public.orders where id = p_order_id for update;
  if v_order_status is null then raise exception 'Order not found.'; end if;
  if v_order_status = 'cancelled' then return true; end if;
  update public.orders set order_status = 'cancelled' where id = p_order_id;
  if v_work_id is not null then
    update public.works set status = coalesce(v_previous_status, 'available'), sold_at = null where id = v_work_id and status = 'sold';
  end if;
  return true;
end;
$$;
revoke all on function public.cancel_order(uuid) from public;
grant execute on function public.cancel_order(uuid) to authenticated;

create or replace function public.request_public_booking(p_name text, p_email text, p_slot_start timestamptz, p_message text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_slot_end timestamptz := p_slot_start + interval '30 minutes';
  v_appointment_id uuid := gen_random_uuid();
  v_open_exists boolean;
  v_blocked boolean;
begin
  if not exists (select 1 from public.feature_flags where key = 'self_booking' and enabled) then raise exception 'Booking is unavailable.'; end if;
  if nullif(trim(p_name), '') is null or length(trim(p_name)) > 100 or lower(trim(p_email)) !~ '^\S+@\S+\.\S+$' or length(trim(p_email)) > 254 or length(coalesce(p_message, '')) > 2000 or p_slot_start <= now() then raise exception 'Invalid booking details.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_slot_start::text, 0));

  select exists (
    select 1 from public.availability a
    where a.kind = 'open'
      and ((a.repeat = 'none' and p_slot_start >= a.starts_at and v_slot_end <= a.ends_at)
        or (a.repeat <> 'none' and p_slot_start::date >= a.starts_at::date and (a.repeat_until is null or p_slot_start::date <= a.repeat_until)
          and p_slot_start::time >= a.starts_at::time and v_slot_end::time <= a.ends_at::time
          and (a.repeat <> 'weekly' or coalesce(array_length(a.repeat_days, 1), 0) = 0 or extract(dow from p_slot_start)::int = any(a.repeat_days))
          and (a.repeat <> 'monthly' or extract(day from p_slot_start)::int = extract(day from a.starts_at)::int)))
  ) into v_open_exists;
  if not v_open_exists then raise exception 'That slot is no longer available.'; end if;

  select exists (
    select 1 from public.availability a
    where a.kind = 'blocked'
      and ((a.repeat = 'none' and p_slot_start < a.ends_at and v_slot_end > a.starts_at)
        or (a.repeat <> 'none' and p_slot_start::date >= a.starts_at::date and (a.repeat_until is null or p_slot_start::date <= a.repeat_until)
          and p_slot_start::time < a.ends_at::time and v_slot_end::time > a.starts_at::time))
  ) into v_blocked;
  if v_blocked or exists (select 1 from public.appointments where starts_at < v_slot_end and ends_at > p_slot_start and status <> 'cancelled') then raise exception 'That slot is no longer available.'; end if;

  insert into public.appointments (id, title, starts_at, ends_at, mode, status, notes)
  values (v_appointment_id, 'Consultation request — ' || trim(p_name), p_slot_start, v_slot_end, 'video', 'requested', 'Name: ' || trim(p_name) || E'\nEmail: ' || lower(trim(p_email)) || E'\n\n' || coalesce(trim(p_message), ''));
  return v_appointment_id;
end;
$$;
revoke all on function public.request_public_booking(text, text, timestamptz, text) from public;
grant execute on function public.request_public_booking(text, text, timestamptz, text) to service_role;
