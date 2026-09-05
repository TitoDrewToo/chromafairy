# Chroma Fairy Blog Block Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give Studio editors a safe, visual way to compose Blog entries from text, headings, highlights, full-width images, and image-plus-text layouts.

**Architecture:** Keep the existing `body` column as a plain-text fallback, and add a `content` JSONB column containing ordered blocks. Images use the existing public `artwork` bucket under `blog/<post-id>/`; server actions validate editor roles, file type, size, and storage paths. The public Blog renders only the validated block model, so no arbitrary HTML is stored or injected.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase Postgres/Storage, existing Chroma Fairy CSS.

---

### Task 1: Define the block model and migration

**Files:**
- Create: `lib/blog-content.ts`
- Modify: `lib/supabase/types.ts`
- Create: `supabase/migrations/20260906_blog_blocks.sql`

- [ ] Add typed blocks: paragraph, heading, quote, image, and split image/text. Store bold as `**text**`, italic as `*text*`, and highlight as `==text==` inside text blocks.
- [ ] Add normalization and plain-text extraction with limits: 80 blocks, 50,000 total text characters, and image paths restricted to `blog/<post-id>/`.
- [ ] Add `content jsonb not null default '{"blocks":[]}'::jsonb` with an `if not exists` guard.

### Task 2: Add secure image and content actions

**Files:**
- Modify: `app/actions/admin-blog.ts`

- [ ] Validate normalized blocks during save and write both `content` and fallback `body`.
- [ ] Add editor-only image upload to `artwork` with the existing 10 MB image rules and `blog/<post-id>/` paths.
- [ ] Add editor-only image removal restricted to that Blog path.
- [ ] Remove stored Blog images when deleting a saved entry.

### Task 3: Build the Studio editor

**Files:**
- Modify: `components/admin-blog.tsx`
- Modify: `app/studio/blog.css`

- [ ] Replace the single body textarea with ordered block cards and add-block controls.
- [ ] Add text, heading, quote, image, and image-plus-text controls.
- [ ] Add selection formatting buttons for bold, italic, and highlight markers.
- [ ] Add image width and alignment controls, move/delete controls, upload previews, and a live layout preview.

### Task 4: Render the public Blog blocks

**Files:**
- Modify: `lib/blog.ts`
- Modify: `app/blog/page.tsx`
- Modify: `app/blog/[slug]/page.tsx`
- Modify: `app/blog/blog.css`

- [ ] Render block content with responsive full/half-width image layouts and safe inline formatting.
- [ ] Fall back to the existing plain `body` when older entries have no blocks.
- [ ] Keep public pages limited to published content.

### Task 5: Verify and ship

- [ ] Run TypeScript, lint, build, and `git diff --check`.
- [ ] Review the staged file list and exclude unrelated edits.
- [ ] Commit and push `main`; do not apply the migration or deploy.
