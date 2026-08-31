# Studio Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the demo sales insights with privacy-preserving page-view and inquiry analytics for day, week, and month periods.

**Architecture:** Public pages emit a small beacon to a server route. The route hashes request identity with a rotating daily server salt and inserts only through the Supabase service role. SQL security-definer functions perform all aggregation, while the protected insights server page checks manager access with the regular session client and reads the functions with the server-only admin client. The existing studio CSS language is extended with a compact analytics layout.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase/Postgres SQL migrations, existing Cormorant Garamond/Jost studio styles.

---

### Task 1: Add the protected analytics schema and typed RPC contracts

**Files:**
- Create: `supabase/migrations/20260831_studio_insights.sql`
- Modify: `lib/supabase/types.ts:398-459`

- [x] **Step 1: Create the migration**

Add `page_views`, its indexes, RLS/revokes, and the four service-role-only aggregation functions. Use a stable daily uniqueness calculation only for day buckets; return `NULL` for week/month unique counts. Add the required 12-month retention comment.

- [x] **Step 2: Add generated-style TypeScript function signatures**

Add `page_views` to `Database.public.Tables` and add the four function argument/return shapes to `Database.public.Functions` so the server page can call typed RPCs without weakening the Supabase client type.

- [x] **Step 3: Run static checks**

Run `pnpm exec tsc --noEmit` and `pnpm lint` after the code changes in later tasks are complete.

### Task 2: Build the privacy-preserving ingest route and public tracker

**Files:**
- Create: `app/api/track/route.ts`
- Create: `components/page-view-tracker.tsx`
- Modify: `app/layout.tsx:30`

- [x] **Step 1: Implement the route**

Read the bounded request body, validate path/referrer, skip studio paths and obvious bots, hash IP + user-agent + UTC date + server secret with SHA-256, and insert with `createAdminClient()`. Return an empty 204 for every input and swallow configuration/database errors.

- [x] **Step 2: Implement the client hook component**

Use `usePathname()` and a `Set` ref to send one beacon per pathname, skip studio routes and Do Not Track, prefer `navigator.sendBeacon`, and fall back to `fetch(..., { keepalive: true })` without blocking rendering.

- [x] **Step 3: Mount it globally**

Render the tracker once inside the root layout so public route changes are covered without touching public page implementations or studio pages.

### Task 3: Replace demo sales insights with traffic/inquiry insights

**Files:**
- Modify: `app/studio/(protected)/insights/page.tsx`
- Modify: `app/studio/operations.css`

- [x] **Step 1: Replace the page data model**

Accept a validated `period` search parameter, calculate current rolling windows for day/week/month, call the four SQL functions through the server admin client, and keep the existing manager authorization check. Show an explicit “no traffic recorded yet” state when the summary has no lifetime rows and “no traffic in this period” when only the selected window is empty.

- [x] **Step 2: Render the analytics UI**

Render day/week/month selector links, page views and inquiries headline metrics, compact CSS-only trend bars with accessible text labels, top pages, referrer/tracked-day context, and a daily-only uniqueness label. Do not show sales/revenue data or preserve it behind a toggle.

- [x] **Step 3: Add responsive styling**

Extend existing studio styles only: warm cream backgrounds, existing serif/sans typography, current line/border colors, two-column desktop layout, and single-column mobile layout.

### Task 4: Verify the implementation

**Files:**
- Inspect: `supabase/migrations/20260831_studio_insights.sql`
- Inspect: `app/api/track/route.ts`
- Inspect: `app/studio/(protected)/insights/page.tsx`

- [x] **Step 1: Run repository verification**

Run `pnpm build`, `pnpm lint`, `pnpm exec tsc --noEmit`, and `git diff --check`.

- [x] **Step 2: Check the security invariants statically**

Confirm the route never inserts IP/user-agent fields, the client tracker never sends studio paths, the migration grants table/function access only to `service_role`, and no `db push` or browser driving is used.

- [x] **Step 3: Report unavailable runtime verification**

Do not probe a deployed preview or drive a browser. Report that Andrew must verify live rows, REST refusal, same-day hash behavior, period figures, and visual/mobile rendering against the real Supabase environment.
