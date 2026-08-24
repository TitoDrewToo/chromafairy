# Landing Page Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a protected `/studio/landing-page` editor that lets authorized Studio users edit section copy and add, reorder, replace, or remove images and entries for Collections, Exhibitions, Press, and Gallery.

**Architecture:** Store the landing page as four typed sections plus ordered content items in Supabase. The public home page loads published content server-side and renders it through a structured React landing component, while retaining the existing visual treatment, WebGL background, animations, and static defaults as a safe fallback. Studio mutations use server actions with admin authorization and the existing artwork upload/conversion path.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase Postgres/RLS/Storage, existing Studio admin layout, existing `heic2any` client conversion, existing `Hint` controls.

---

## Current structure to preserve

- `app/page.tsx` currently reads styles and markup from `index.html` and passes them to `components/home-client.tsx`.
- The current public sections are hardcoded in `index.html` at `#collections`, `#exhibitions`, `#gallery`, and `#press`.
- `components/home-client.tsx` owns background texture scene stops and interactive press modals. The IDs `collections`, `exhibitions`, `gallery`, and `press` must remain unchanged.
- `app/studio/(protected)/layout.tsx` owns authorization and navigation. The new page must be inside this protected route tree.
- `app/actions/admin-catalogue.ts` contains the current admin authorization and image-upload conventions. The landing editor must not write to `work_images`.

## Data contract

Create two tables:

```sql
create table public.landing_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique check (section_key in ('collections', 'exhibitions', 'press', 'gallery')),
  eyebrow text not null default '',
  title text not null default '',
  body text not null default '',
  display_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.landing_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.landing_sections(id) on delete cascade,
  item_type text not null default 'entry' check (item_type in ('entry', 'image')),
  eyebrow text not null default '',
  title text not null default '',
  subtitle text not null default '',
  body text not null default '',
  source text not null default '',
  image_path text,
  image_alt text,
  link_url text,
  link_label text,
  display_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

`image_path` accepts either an existing public asset such as `/assets/sel-flowL.jpg` or a private Studio upload path such as `landing/collections/<uuid>.jpg`. The public resolver converts only storage paths to Supabase public URLs and leaves `/assets/` paths unchanged.

## File map

- Create: `supabase/migrations/20260822_landing_page_content.sql` — tables, indexes, updated-at trigger, RLS, policies, and seed rows matching the existing landing page.
- Modify: `lib/supabase/types.ts` — `LandingSection`, `LandingItem`, and section key types.
- Create: `lib/landing-page.ts` — public content types, default content, Supabase loader, image URL resolver, and ordering helpers.
- Create: `app/actions/admin-landing-page.ts` — authorized section/item save, reorder, delete, and image upload/delete actions.
- Create: `app/studio/(protected)/landing-page/page.tsx` — server page that loads editable content and renders the editor.
- Create: `components/admin-landing-page.tsx` — client editor for section copy, item fields, image selection, add/remove, reorder, save, and error states.
- Create: `app/studio/landing-page.css` — editor-specific layout and responsive rules, imported by the Studio page.
- Modify: `app/studio/(protected)/layout.tsx` — add `Landing page` to `staffAreas` with hint id `navLandingPage`.
- Modify: `lib/studio-hints.ts` — add hints for navigation, section fields, item fields, image replacement, add, remove, reorder, and save.
- Create: `components/home-landing-content.tsx` — structured public rendering of the four editable sections, preserving the existing IDs/classes and current visual layout.
- Modify: `app/page.tsx` — load published landing content and pass it to the public renderer while retaining the existing style extraction and default fallback.
- Modify: `components/home-client.tsx` — accept/render the structured landing content and keep the current background scene stops and press modal behavior.
- Modify: `index.html` — retain shared style definitions and non-editable sections, but remove the four hardcoded editable section bodies once the React renderer is live.

### Task 1: Add the database model and seed content

**Files:**
- Create: `supabase/migrations/20260822_landing_page_content.sql`
- Modify: `lib/supabase/types.ts`

- [ ] **Step 1: Write the migration** with the exact tables above, `section_id/display_order` indexes, an `updated_at` trigger, and RLS enabled on both tables.
- [ ] **Step 2: Add policies** so `authenticated` users with `public.is_admin()` can select/insert/update/delete Studio content, while anonymous users can select only rows where both the section and item are published. Do not grant anonymous insert, update, or delete.
- [ ] **Step 3: Seed four sections** from the current `index.html`: Collections / Eternal Flow, Exhibitions / On View, Gallery / Other Works, and Press / In Print & On View. Seed every current card/image/link as an ordered item, using the existing `/assets/...` paths.
- [ ] **Step 4: Add matching TypeScript types** and run `npx tsc --noEmit`.
- [ ] **Step 5: Apply the migration to the intended Supabase project and verify** anonymous reads return published content while an unauthenticated write is rejected.
- [ ] **Step 6: Commit** with `feat: add landing page content model`.

### Task 2: Build the public content loader and renderer

**Files:**
- Create: `lib/landing-page.ts`
- Create: `components/home-landing-content.tsx`
- Modify: `app/page.tsx`
- Modify: `components/home-client.tsx`
- Modify: `index.html`

- [ ] **Step 1: Define the loader contract** as `getPublishedLandingPage(): Promise<LandingPageContent>` and make it return deterministic default content if Supabase is unavailable or the query fails.
- [ ] **Step 2: Implement image resolution** so `/assets/...` remains a local public URL and a stored Supabase path becomes a public artwork-bucket URL without exposing admin-only records.
- [ ] **Step 3: Port the four editable sections into `HomeLandingContent`** using the current classes and IDs. Preserve the current three-column Collections wall, Exhibition duo layout, Gallery single/duo layout, Press cards, captions, links, and modal trigger attributes.
- [ ] **Step 4: Render all text as React text nodes** and all URLs through an allowlist for `http`, `https`, `/`, and `#` values. Do not inject database content through `dangerouslySetInnerHTML`.
- [ ] **Step 5: Keep the existing `home-client.tsx` behavior** by passing the same root element and ensuring its scene-stop query still finds all four IDs. Press modal IDs must remain unique when items are added.
- [ ] **Step 6: Verify visually** that a database-backed page matches the current static page when seeded content is unchanged, including desktop, mobile, reduced-motion, missing-image, and empty-item states.
- [ ] **Step 7: Commit** with `feat: render landing page content from Supabase`.

### Task 3: Add authorized landing-page server actions

**Files:**
- Create: `app/actions/admin-landing-page.ts`

- [ ] **Step 1: Add a shared authorization helper** that creates the server Supabase client, calls `is_admin()`, and returns a safe error result when the session is absent or unauthorized.
- [ ] **Step 2: Implement `updateLandingSection(input)`** with UUID/section-key validation, bounded text lengths, and updates for eyebrow, title, body, display order, and publication state.
- [ ] **Step 3: Implement `createLandingItem(input)` and `updateLandingItem(input)`** with section ownership validation, bounded fields, safe link validation, and ordered insertion/update.
- [ ] **Step 4: Implement `deleteLandingItem(itemId)`** by deleting the row first and then removing its `landing/<section>/<uuid>.*` storage object when the path is owned by the landing system. Never delete `/assets/...` files.
- [ ] **Step 5: Implement `uploadLandingImage(input)`** using the already working `prepareArtworkFile` browser conversion. Store the resulting JPEG under `landing/<sectionKey>/<uuid>.jpg` and return the storage path. Do not use `work_images`.
- [ ] **Step 6: Implement `reorderLandingItems(sectionId, orderedIds)`** with a complete-set check so a client cannot reorder or mutate items from another section.
- [ ] **Step 7: Add server-side tests or a small authenticated verification script** covering unauthorized mutation, cross-section item rejection, deletion cleanup, and invalid links.
- [ ] **Step 8: Commit** with `feat: add landing page admin actions`.

### Task 4: Build the Studio Landing Page editor

**Files:**
- Create: `app/studio/(protected)/landing-page/page.tsx`
- Create: `components/admin-landing-page.tsx`
- Create: `app/studio/landing-page.css`

- [ ] **Step 1: Load all four sections and ordered items** on the server page and render a clear page heading: `Landing page` with a link to view the public site.
- [ ] **Step 2: Build one section editor per section** with editable eyebrow, title, body, and published toggle. Use the current Studio field styling and show which public section each card controls.
- [ ] **Step 3: Build item editors** with fields for item eyebrow, title, subtitle, body, source, link URL, link label, alt text, published state, and image. Show an image preview or a clear no-image state.
- [ ] **Step 4: Add `Add entry` and `Remove` actions** per section. Require confirmation before removal and show a success/error message after each mutation.
- [ ] **Step 5: Add drag-and-drop or explicit up/down reorder controls**. Use explicit up/down controls as the baseline for keyboard accessibility and add drag behavior only if it does not replace them.
- [ ] **Step 6: Add image replacement** through the existing file input rules, including JPG/PNG/WebP/GIF/HEIC/HEIF, client conversion, preview, upload progress state, and cleanup on failed save.
- [ ] **Step 7: Prevent data loss** by disabling conflicting controls during a save, preserving unsaved values after a failed request, and warning when navigating away with dirty edits.
- [ ] **Step 8: Verify responsive behavior** at desktop and mobile widths, including long titles, empty sections, many items, long URLs, and missing images.
- [ ] **Step 9: Commit** with `feat: add Studio landing page editor`.

### Task 5: Add Studio navigation and guidance

**Files:**
- Modify: `app/studio/(protected)/layout.tsx`
- Modify: `lib/studio-hints.ts`

- [ ] **Step 1: Add `Landing page` to `staffAreas`** at `/studio/landing-page`, visible to the same administrators who can edit the catalogue.
- [ ] **Step 2: Add hint text** explaining that this editor changes the public Collections, Exhibitions, Press, and Gallery sections, and that catalogue edits remain separate.
- [ ] **Step 3: Verify the link appears in desktop and mobile Studio navigation** and that non-admin users remain blocked by the existing layout authorization.
- [ ] **Step 4: Commit** with `feat: add landing page Studio navigation`.

### Task 6: End-to-end verification and documentation

**Files:**
- Modify: `docs/System_Journal.md`
- Create: `docs/Landing_Page_Editor_Guide.md`

- [ ] **Step 1: Run `npm run lint`, `npm run build`, and `git diff --check`**.
- [ ] **Step 2: Test the public fallback** with Supabase unavailable and confirm the home page still renders.
- [ ] **Step 3: Test the public database path** by changing a section title and confirming the change appears after refresh without exposing drafts.
- [ ] **Step 4: Test Studio mutations** for edit, add, reorder, image replacement, HEIC upload, remove, failed upload recovery, and publish/unpublish.
- [ ] **Step 5: Test authorization** as owner/admin, staff if staff access is intentionally allowed, signed-out user, and an authenticated non-admin.
- [ ] **Step 6: Test accessibility** with keyboard-only navigation, labels for all fields, focus after add/remove/save, and meaningful image alt text.
- [ ] **Step 7: Document the content model, image storage rules, publish behavior, and recovery procedure** in `docs/Landing_Page_Editor_Guide.md` and record the architecture decision in `docs/System_Journal.md`.
- [ ] **Step 8: Commit** with `docs: document landing page editing`.

## Acceptance criteria

- `/studio/landing-page` is protected by the existing Studio authorization.
- The editor can change copy for Collections, Exhibitions, Press, and Gallery.
- The editor can add, remove, reorder, publish/unpublish, and edit entries in each section.
- The editor can replace images with JPG, PNG, WebP, GIF, HEIC, or HEIF files.
- HEIC/HEIF files show a converted preview and save as JPEG-backed landing images.
- The public page displays only published content and preserves existing visual effects, section IDs, links, and responsive layout.
- Existing seeded content looks materially the same before and after the migration.
- Failed saves do not leave partial database rows or orphaned landing storage files.
- Anonymous users cannot mutate landing content.
- `npm run lint` and `npm run build` pass.

## Self-review

- **Spec coverage:** The plan covers a new protected Studio tab, copy editing, image editing, adding, removing, ordering, public rendering, authorization, storage cleanup, and testing.
- **Architecture boundary:** Landing content is separate from catalogue works and `work_images`; no existing shop data is repurposed.
- **Fallback:** The existing static page remains a usable fallback while database content is missing or unavailable.
- **Security:** User-provided text is rendered as React text, links are validated, writes use server-side authorization, and storage deletion is path-scoped.
