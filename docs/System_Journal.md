# Chroma Fairy — System Journal

*Living system-state doc, authored/maintained by Claude, giving the studio's AI error-triage layer accurate context to reason about a failure without reading raw source. Sectioned by **tool key** (matches `error_events.tool`). Keep dense/factual; update on material changes; append the Changelog.*

---

## GLOBAL — architecture & conventions
- **Stack:** Next.js (App Router, TS, Tailwind) · Supabase (Postgres + RLS + Storage `artwork` bucket + Auth) · Vercel. Domain `chromafairy.com` (in progress; live on `chromafairy.vercel.app`).
- **Security model:** RLS is the boundary. Service-role key is server-only (`createAdminClient`, `import "server-only"`). `is_admin()` = owner/admin/staff/developer; `is_user_manager()` = **owner/dev/admin** (SECURITY DEFINER, `set search_path = public`). Roles: owner, admin, staff, developer.
- **Global page transition** (`components/global-page-transition.tsx`): a chroma-fairy loading buffer on hard load/refresh, a light fade+rise on client navigation, and the fairy **replays when navigating to `/`**. Gotcha: a lingering `transform` on `.global-page-frame` at rest breaks `position:fixed` descendants (the header) — the frame must resolve `transform:none` when settled.
- **Chroma effects:** animated multi-color gradient on hover/buttons (the brand). Shop filter buttons: **black idle, chroma gradient when active** (the Systems Diagnose button reuses this).
- **Auth email links** derive from `SITE_URL` (`lib/site.ts`, defaults to `https://chromafairy.com`). If `NEXT_PUBLIC_SITE_URL` is unset while live on vercel.app, invite/reset links point at the not-yet-live domain and break.

## shop — public catalogue
- `/shop` grid: non-exclusive status filters (Available/New vs Sold/Reserved), Year→Series collapsible grouping, chroma buttons, loading-shimmer skeletons. `/shop/[slug]`: gallery, price ₱($), status badge, Inquire, SEO/OG/JSON-LD. Anon reads via RLS (works/series where `status <> 'draft'` / `is_published`). Files: `app/shop/*`, `components/shop-image.tsx`.
- Gotchas: drafts are hidden from the shop (RLS). JSON-LD omits `offers.price` when price is null (never advertise an invalid price).

## studio-catalogue — works management
- `app/studio/(protected)/catalogue` — works CRUD + **batch** (bulk status/series), drag-drop image upload to the `artwork` Storage bucket, series **pick-or-create**, one-tap status. Files: `components/admin-catalogue.tsx`, `admin-work-form.tsx`.
- Gotchas: image uploads validated server-side (max size + MIME/extension allowlist); object URLs revoked on remove.

## sales — record a sale (manual now)
- `app/studio/(protected)/sales` — records a sale via an **atomic, status-guarded RPC** (`record_sale`): locks the work, only sells `available`/`reserved`, writes customer + order + work-status (+ optional shipment) in one transaction; **cancel restores** the work status. Feeds Insights. Files: `components/admin-sales.tsx`, `lib/admin-sales.ts`.
- Gotcha: never sell a draft/already-sold work — the RPC rejects it.

## scheduling — availability & appointments
- `availability` (single date / range / **recurring** via `repeat`/`repeat_days`/`repeat_until`) + `appointments` (linked to customer+inquiry; `external_calendar`/`external_event_id` reserved for Google sync). Public self-service booking is gated by the **`self_booking`** flag: reads `open` availability minus blocks/appointments and writes appointment requests **atomically**. Files: `lib/public-booking.ts`, `app/actions/public-booking.ts`, `components/admin-scheduling.tsx`, `self-booking-form.tsx`.
- Gotchas: atomic availability-check + insert (no double-booking); timezone **Asia/Manila**; `self_booking` is off by default.

## inquiries — piece + commission leads
- Two flows: piece inquiry (product page) + commission inquiry (home). The insert is **server-side and hardened**: validate the work UUID, confirm it's non-draft, and **derive `work_title_snapshot` from the DB** (ignore any client value); honeypot/length/email checks + rate limit. Notification marks `notified_at` (real email is a stub pending Resend). Files: `components/inquiry-form.tsx`, `app/actions/inquiries.ts`.
- Gotcha: never trust client-supplied `work_id`/snapshot (that was the pre-hardening bug).

## auth — sign-in, invite, password reset, users
- Supabase Auth (email/password via `signInWithPassword`) + roles. **Invite:** `inviteUserByEmail` with `redirectTo` → `/studio/set-password`; the invitee sets a password there. **Forgot password:** `resetPasswordForEmail` → `/studio/set-password?mode=reset` (recovery session established via `detectSessionInUrl`/PKCE). User management (invite/role/**delist**) gated to **owner/dev/admin** (`is_user_manager`); Remove-user deletes the auth user + profile. Sign-out is a server action (clears the httpOnly cookie). Files: `app/studio/login/page.tsx`, `components/admin-set-password.tsx`, `app/actions/admin-users.ts`.
- Gotchas: `NEXT_PUBLIC_SITE_URL` must match the live domain or invite/reset email links break. Supabase **Redirect URLs** must allowlist `/studio/set-password`. Custom email templates + reliable delivery need **SMTP (Resend)**; the default Supabase sender is rate-limited. The invite UI shows an optimistic `pending-<email>` placeholder with no Remove button until a page refresh (cosmetic only).

## feature-flags / settings
- `feature_flags` table (`payments`, `shipping_automation`, `self_booking`, `calendar_sync`), default off, public-read + admin-write. Settings page toggles grouped **Scheduling** (calendar_sync, self_booking) / **Sales** (payments, shipping_automation). Payments/shipping/calendar_sync need external providers to activate; `self_booking` is flip-and-go once availability exists.

## systems — error monitoring (this feature)
- `error_events`/`error_groups` + capture (self-safe, fire-and-forget) + studio **Systems** page (owner/dev/admin) + `diagnose-error` edge function (Anthropic-only on `ANTHROPIC_SYSTEMS_API_KEY`, internal auth via `SYSTEMS_INTERNAL_SECRET`). Observation mode — Execute disabled. Dual **UTC + Asia/Manila** timestamps. Diagnose button uses the chroma style (black idle → chroma gradient while diagnosing).

## studio-notes
- Studio Notes is a client-side Supabase feature in `components/studio-notes.tsx` and `lib/use-studio-notes.ts`. Personal `studio_notes` rows are fetched and autosaved only for the signed-in user; RLS remains the privacy boundary and enforces the 120-character title / 50,000-character body checks.
- The Overview renders the notes panel beside the daily verse. Other Studio pages render a portal-based right-edge drawer so it is not clipped by the shell or page-transition frame. Drawer open state, active note page, and Notes/Team board view persist in localStorage.
- `studio_board` stays an invitation-only empty state while there is one Studio member. With more than one member, the client reads the RLS-protected feed and can post with the authenticated user's `author_id`. No service-role client path is used.

---

## TIMELINE
- 2026-08-08 · feature · studio · Added private per-user Studio Notes with debounced autosave, page management, persistent drawer/overview panel, and a member-gated Team board.
- 2026-08-08 · monitoring triage · systems · Added two-axis journal retrieval design: time windows and topic scopes remain independently selectable.
- 2026-08-08 · deployment · systems · Studio diagnosis remains Anthropic-only, internally authenticated, and observation-only.
- 2026-08-08 · feature · studio · Added Systems refresh, tooltips, sticky shell scrolling, and invite-list refresh after successful invites.
- 2026-08-07 · security fix · prescan · Benign PDF OpenAction view actions no longer trigger the active-content block.

## CHANGELOG
- **2026-08-08** — Error monitoring + AI triage (studio, observation mode).
- **2026-08** — Studio hover-hints tutorial + KJV daily verse; header + fairy-splash fixes; security hardening (inquiry binding, atomic sale/booking RPCs, owner/dev/admin authz, upload limits); `/admin`→`/studio` rename; settings feature-flag grouping.
- *(Append future material changes, migrations, and newly-learned gotchas here.)*
