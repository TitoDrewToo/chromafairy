# Refuted and uncertain review claims

Review date: 2026-08-25. These claims were investigated and were not promoted to `FINDINGS.md`.

## R-001 — Original booking race claim: refuted as stated; narrower race survives

The original claim said `request_public_booking` had no serialization and that two concurrent calls for the same slot could both insert. That is false. `supabase/hardening.sql:120` contains:

```sql
perform pg_advisory_xact_lock(hashtextextended(p_slot_start::text, 0));
```

Same-start calls use the same advisory key and serialize. The claim was refined rather than discarded: offset starts use different keys while lines 140–143 apply an overlap check and insert the interval. That narrower, confirmed claim is F-001.

## R-002 — Sales are not atomic: refuted

`supabase/hardening.sql:35-87` implements `record_sale` as one PL/pgSQL transaction, checks admin access, locks the work row with `for update`, validates availability, writes the customer/order/shipment records, and marks the work sold. The seeded “sales race” is not a finding.

## R-003 — Booking race is fully solved by the advisory lock: refuted/uncertain

The advisory lock solves only equal `p_slot_start` values. It does not solve overlapping unequal starts, as the live key evaluation confirms. This claim is recorded here as the killed broad version; the surviving narrower version is in `FINDINGS.md`.

## R-004 — Public landing content creates an HTML injection path: refuted

`lib/landing-page-html.ts` escapes text and attribute values through `text()`/`attr()` before inserting CMS values into markup. React-rendered admin values are also escaped by React. A CMS user can create a link or visible text, but the reviewed rendering path does not turn quotes or tags into executable markup.

## R-005 — Public artwork metadata exposes draft works: refuted at the table layer

`../supabase/schema.sql:166-168` restricts public `work_images` reads through an `exists` query requiring the related work to have `status <> 'draft'`; the public works policy applies the same status boundary. The storage bucket is public, which remains a backlog concern for leaked object paths, but the reviewed metadata query does not expose draft rows.

## R-006 — Error-event RPC is callable by anonymous clients: refuted

`supabase/migrations/20260823_error_monitoring.sql:113-114` revokes the RPC from public, anon, and authenticated roles and grants it only to `service_role`. The API route uses the server-only admin client for persistence. The Edge Function separately requires `SYSTEMS_INTERNAL_SECRET` despite `verify_jwt = false`.

## R-007 — Phase 1 splash durations were lengthened again: refuted

`components/global-page-transition.tsx` retains `BUFFER_MIN_MS = 1200` and `BUFFER_MAX_MS = 4800`, matching the already-lengthened values in the brief. No further duration increase was found.

## Execution limitations

The live booking overlap result in F-001 was supplied by the user from a read-only live-database evaluation. Local execution of concurrent transactions was unavailable: no `psql`, `postgres`, or running Docker/Supabase runtime existed in the workspace. No claim was promoted based on a simulated transaction.

