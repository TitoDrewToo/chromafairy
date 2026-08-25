# Chroma Fairy review findings

Review date: 2026-08-25  
Scope: Phase 2 review of the current `cf/optimization-and-review` branch.  
No application or SQL fixes were made.

## BREAKS UNDER LOAD

### F-001 — Offset booking starts bypass the advisory lock and can double-book an overlapping interval

**Status: FIXED.** `supabase/migrations/20260829_appointments_no_overlap.sql` adds the `btree_gist` extension and `appointments_no_overlap` exclusion constraint. `supabase/hardening.sql` maps SQLSTATE `23P01` to the existing unavailable-slot error. The live table had zero appointment rows when the constraint was installed.

**Location:** `supabase/hardening.sql:110-143`

**Actual code:**

```sql
v_slot_end timestamptz := p_slot_start + interval '30 minutes';
...
perform pg_advisory_xact_lock(hashtextextended(p_slot_start::text, 0));
...
if v_blocked or exists (
  select 1 from public.appointments
  where starts_at < v_slot_end
    and ends_at > p_slot_start
    and status <> 'cancelled'
) then raise exception 'That slot is no longer available.'; end if;
...
insert into public.appointments (... starts_at, ends_at ...)
values (... p_slot_start, v_slot_end ...);
```

**Reproduction:** Enable `self_booking`, create an open window containing both starts, and invoke the service-role-granted `request_public_booking` concurrently with `p_slot_start = '2026-09-01 10:00:00+00'` and `p_slot_start = '2026-09-01 10:15:00+00'`. The live read-only evaluation supplied for this review reports:

```text
hashtextextended(10:00::text, 0) =  5631935549475785606
hashtextextended(10:15::text, 0) = -2201118683811845469
same_lock = false
```

The calls therefore do not serialize. Each transaction can observe no conflicting appointment and insert a 30-minute interval. The overlap predicate then permits two appointments covering 10:15–10:30.

**Why it is wrong:** The invariant is that an accepted appointment must not overlap another non-cancelled appointment. The lock key is the exact caller-supplied start, while the invariant is an interval-overlap invariant. The precondition is that starts are not snapped to a fixed grid; the function accepts arbitrary `timestamptz` values and is callable through the service-role path used by `requestBooking`.

**Refutation attempted:** The original broader claim—that the advisory lock was absent and that ordinary same-start requests raced—was refuted and is logged in `REFUTED.md`. The narrower offset-start claim survives because the evaluated lock keys differ. The overlap check is not a substitute for serialization or a database exclusion constraint.

**Execution evidence:** Confirmed by the supplied live, read-only hash evaluation. A local transaction harness was not available because this workspace has no running Postgres/Docker runtime; no fake simulation was substituted.

**Resolution:** The table now enforces the interval invariant with an exclusion constraint over `tstzrange(starts_at, ends_at)` for non-cancelled rows. The booking function translates an exclusion violation to `That slot is no longer available.`

### F-002 — Anonymous REST clients can bypass inquiry validation and rate limiting

**Status: FIXED.** `supabase/migrations/20260828_inquiry_insert_hardening.sql` revokes anonymous and authenticated direct writes and adds database length checks. The server action now owns the service-role insert path.

**Location:** `../supabase/schema.sql:170-172` and `app/actions/inquiries.ts:23-77`

**Actual code:**

```sql
create policy p_inq_insert on inquiries for insert with check (true);
create policy p_inq_admin_read on inquiries for select using (is_admin());
create policy p_inq_admin_upd  on inquiries for update using (is_admin());
```

```ts
if (input.honeypot || !Number.isFinite(input.startedAt) || Date.now() - input.startedAt < 1200) return { ok: true };
...
if (!allowInquiry(`${address}:${email}`)) return { ok: false, error: "Too many inquiries from this address. Please try again later." };
...
const { error } = await supabase.from("inquiries").insert({ ... });
```

**Reproduction:** Using the public Supabase URL and anon key, POST an arbitrary row directly to the REST endpoint for `public.inquiries`, for example a row with an invalid email, an oversized message, `status = 'closed'`, or repeated requests. The live read-only permission check confirms:

```text
anon holds INSERT on public.inquiries
p_inq_insert: cmd=INSERT, with_check=true, roles=PUBLIC
no anon SELECT policy exists
```

The REST insert succeeds without executing `submitInquiry`; therefore the honeypot, elapsed-time check, field validation, and `allowInquiry` rate limit are bypassed. The absence of an anon SELECT policy correctly prevents reading the inserted rows.

**Why it is wrong:** The public inquiry contract is “validated, rate-limited submissions,” but the database grants an unauthenticated caller an unvalidated write path. The impact is abuse and storage pollution—not data exposure. The in-memory rate-limit map compounds the problem because it is not shared across Vercel instances.

**Refutation attempted:** The action itself validates kind, UUIDs, email, lengths, honeypot timing, and rate limits, and RLS correctly blocks anonymous reads. The live permission evidence confirms those protections are bypassable rather than sufficient.

**Execution evidence:** Confirmed by the supplied live, read-only grants and policy inspection. No anonymous read capability was found.

**Resolution:** The public insert policy and direct write grants were removed by `supabase/migrations/20260828_inquiry_insert_hardening.sql`; `submitInquiry` performs the validated server-side insert through the service-role client.

## No BREAKS NOW findings

No confirmed current single-user data exposure or data loss was found. F-002 was abuse/storage impact and is now fixed.
