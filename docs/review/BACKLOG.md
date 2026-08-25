# Chroma Fairy review backlog

Review date: 2026-08-25. These are real or plausible concerns that did not clear the two-severity gate, or that lack the evidence required for `FINDINGS.md`. No fixes were made.

## Data integrity and authorization

- `app/actions/admin-landing-page.ts:32-40` performs a count-then-upsert for section limits. Concurrent authorized editors can both pass the count and exceed the intended section limit. This is an admin-only concurrency edge and has no live execution evidence here.
- `app/actions/admin-landing-page.ts:61-64` updates reordered items with independent concurrent requests rather than one transaction. Two simultaneous reorder operations can leave duplicate or unexpected `display_order` values. Admin-only and low likelihood.
- `app/actions/admin-users.ts:7-22,27-36` lets any `is_user_manager()` role—including `admin`—assign any of `owner`, `admin`, `developer`, or `staff`. The intended role hierarchy is not expressed as a database invariant, so this is a least-privilege policy question rather than a proven unauthorized path.
- `components/admin-scheduling.tsx` writes availability and appointments directly from the browser. RLS protects the tables, but there are no database checks for valid appointment intervals, status values, or non-overlap for manually created appointments.

## Input, abuse, and storage

- `app/actions/inquiries.ts:66-111` treats notification as best effort and returns success after the inquiry is saved even when `RESEND_API_KEY` is missing or Resend fails. This is a known seeded behavior; it should surface operationally but is not data loss.
- `app/actions/inquiries.ts:39-40` uses an in-memory rate-limit map. Vercel instances do not share it, so distributed abuse can exceed the intended five-per-window limit.
- `app/api/errors/route.ts:8-10,25-30` also rate-limits in memory; multiple instances can bypass the 30-per-minute bucket. The endpoint is intentionally self-safe and accepts only sanitized error records.
- `supabase/schema.sql` makes the artwork bucket publicly readable at bucket scope. Draft or orphaned object paths are not enumerable through the public metadata policies, but anyone holding a path can fetch the object.
- `app/actions/admin-catalogue.ts:11-37` and `admin-landing-page.ts:67-89` validate extension and declared MIME metadata but do not inspect file signatures. This is an admin-upload integrity concern, not an anonymous upload path.

## Correctness and cleanup

- `app/actions/admin-catalogue.ts:65-81` deletes database rows before removing storage objects and returns a warning on storage cleanup failure. This can leave orphaned artwork files; it does not lose the catalogue row.
- `app/actions/admin-landing-page.ts:50-54` ignores storage removal errors after deleting a landing item, also permitting orphaned files.
- `app/actions/admin-users.ts:20-23` can send an invitation and then fail to persist the profile role, leaving an invited auth user with an inconsistent profile state.
- `components/studio-notes.tsx` autosaves through client-side Supabase calls. Error display and retry behavior should be checked with a disconnected session; no production execution was available.

## Performance

- `app/shop/page.tsx:47-52` selects every non-draft work and every image for the catalogue without pagination. The landing and studio catalogue pages similarly use unbounded `select("*")` queries.
- `lib/public-booking.ts:8-18` loads all availability rows and all future appointments before expanding only a 60-day horizon in memory. This is acceptable at current scale but grows with history.
- `app/studio/(protected)/insights/page.tsx:15-18` loads all paid-order inputs and related tables, then aggregates in JavaScript. It will become an expensive report as order volume grows.
- Several public and studio paths run independent related queries in parallel rather than using constrained joins. This is not an N+1 loop at current code paths, but the unbounded result sizes should be monitored.

## Schema drift and maintainability

- `supabase/hardening.sql` contains production functions and grants but is not a migration. A fresh replay of `../supabase/schema.sql` plus `supabase/migrations/` does not reproduce those hardening functions unless the loose file is run separately.
- `../supabase/schema.sql` predates `landing_*`, `error_*`, `studio_*`, `archived_at`, `context_scope`, and the staff-role migrations. It is a snapshot, not a reproducible source of truth.
- `supabase/migrations/20260825_staff_role_access.sql` documents “Systems” as a restricted area even though the systems checker was removed. This is stale prose in a migration comment, not a runtime defect.
- `app/studio/(protected)/[area]/page.tsx` is a future-area stub that overlaps named routes and can render a generic page for arbitrary area strings. It is reachable but intentionally inert.

## Flags and dead paths

- `app/studio/(protected)/[area]/page.tsx` contains the generic `orders` area while navigation points to `/studio/sales`; this is dead/duplicate route surface.
- ESLint reports raw `<img>` warnings in public and admin components. Phase 1 deliberately used Supabase transforms rather than `next/image`; the warnings are tracked here as an ergonomics item, not an automatic defect.
