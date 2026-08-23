# Inquiry Archive and Official Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let Studio staff archive inquiries from the visible inbox while retaining rows in Supabase, and make the official footer fairy logo the favicon and loading identity with consistent sizing.

**Architecture:** Add nullable `archived_at` storage state to inquiries, filter archived rows out of the inbox, and expose an authenticated archive action from the existing inquiry card. Use the footer’s `fairy-logo-option-v2.png` as the canonical brand asset, derive the app icon from it, and update the animated/loading component and CSS to use its portrait aspect ratio.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase Postgres/RLS, PNG assets, existing Studio operations UI.

---

### Task 1: Archive inquiries without deleting rows

**Files:**
- Create: `supabase/migrations/20260823_inquiry_archive.sql`
- Modify: `lib/supabase/types.ts`
- Modify: `app/studio/(protected)/inquiries/page.tsx`
- Modify: `components/admin-inquiries.tsx`
- Modify: `app/studio/operations.css`

- [ ] Add nullable `archived_at timestamptz` to `public.inquiries`, index active rows, and allow existing Studio admin update policies to archive rows.
- [ ] Add `archived_at` to the TypeScript inquiry contract and exclude archived rows in the server inbox query with `.is("archived_at", null)`.
- [ ] Add an authenticated archive button that updates `archived_at` and removes the card from local state; keep the action reversible in storage and label it “Archive”.
- [ ] Add compact archive-button styling and an empty-state message that explains archived inquiries remain stored.
- [ ] Build and run focused lint/type checks.

### Task 2: Replace favicon and loading identity

**Files:**
- Replace: `app/icon.png`
- Modify: `components/animated-fairy.tsx`
- Modify: `app/globals.css`
- Modify: `app/shop/shop.css`
- Modify: `app/layout.tsx`

- [ ] Derive a square favicon from `public/fairy-logo-option-v2.png` while preserving the current favicon’s visible scale and angled/portrait composition.
- [ ] Make `AnimatedFairy` use the official footer logo and portrait sizing so the full mark remains distinguishable in the global splash and Studio loading state.
- [ ] Update shimmer masks and shop fallback masks to the official logo asset and remove the old wide-logo assumptions.
- [ ] Add an explicit icon reference if needed, then verify generated metadata points to the official mark.
- [ ] Build, lint, and inspect the final asset dimensions/alpha.

### Task 3: Verify and ship

- [ ] Confirm no unrelated worktree files are staged.
- [ ] Run `npm run build`, focused ESLint, and `git diff --check`.
- [ ] Commit inquiry archive and branding changes in scoped commits.
- [ ] Push `main` and report commit hashes.
