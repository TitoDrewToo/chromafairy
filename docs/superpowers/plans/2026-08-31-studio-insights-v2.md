# Studio Insights v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revise `/studio/insights` into a calm, comparison-led weekly dashboard with conversion, sparse-data handling, and accessible hand-rolled SVG data marks.

**Architecture:** Keep the existing tracker, migration, and SQL functions. The server page calls the existing RPCs for the current period, previous equal period, and trend window, computes only display deltas/conversion, and renders the page with server components plus native SVG hover titles. Existing studio CSS is updated so data marks use one accessible accent and no data element animates.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, existing Supabase RPCs, CSS/SVG.

---

### Task 1: Replace the metrics model

**Files:**
- Modify: `app/studio/(protected)/insights/page.tsx`

- [x] **Step 1: Make weekly the default**

Use current UTC day/week/month windows for headline values and equal-length preceding windows for comparison. Keep day, week, and month selector links.

- [x] **Step 2: Add comparison-led metrics**

Render hero inquiries, views, inquiries, and conversion per 100 visits. Show absolute deltas against the preceding period with the correct period label, and render no delta when the preceding period has no data.

- [x] **Step 3: Keep aggregation in Postgres**

Use `get_traffic_summary`, `get_inquiry_total`, `get_views_by_period`, `get_inquiry_counts_by_period`, and `get_top_pages`; only derive ratios, deltas, and chart geometry in the page.

### Task 2: Implement the visual system and interaction

**Files:**
- Modify: `app/studio/(protected)/insights/page.tsx`
- Modify: `app/studio/operations.css`

- [x] **Step 1: Render the editorial hierarchy**

Order the page as Attention, Interest, and What drew it. Use unboxed ink-colored figures, muted labels/deltas, tabular numerals, and `#a16207` only for data marks and positive/current accents.

- [x] **Step 2: Add sparklines and the sparse-data trend**

Render three compact SVG sparklines in the stat tiles. Render one larger SVG area trend only when at least six populated periods exist. Add native SVG hover titles, larger invisible hit circles, a hover crosshair, and selective peak/current labels.

- [x] **Step 3: Add top-page bars and empty states**

Render top pages as single-hue horizontal bars with truncated paths and per-bar titles. Distinguish no data at all, no data this period, and one/two populated periods with an intentional “trend appears after six populated periods” message.

- [x] **Step 4: Make the page responsive and motion-safe**

Stack figures and sections on mobile, keep the selector thumb-reachable, remove animation from all data marks, and disable chart transitions under reduced motion.

### Task 3: Verify and hand off

**Files:**
- Inspect: `app/studio/(protected)/insights/page.tsx`
- Inspect: `app/studio/operations.css`

- [x] **Step 1: Run checks**

Run `pnpm build`, `pnpm lint`, `pnpm exec tsc --noEmit`, and `git diff --check` sequentially so the Next-generated types are not removed during a concurrent build.

- [x] **Step 2: Confirm scope**

Confirm no migration, tracking route, SQL function, shop, landing page, inbox, or other studio page changed. Do not drive a browser; Andrew verifies the visual result.
