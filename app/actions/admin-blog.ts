"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type BlogInput = { id: string; slug: string; title: string; excerpt: string; body: string; isPublished: boolean; publishedAt: string };

export async function upsertBlogPost(input: BlogInput) {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { data: allowed } = await supabase.rpc("is_blog_editor");
  if (!allowed) return { ok: false, error: "Only owners, admins, and developers can edit blog entries." };
  if (!UUID_PATTERN.test(input.id) || !SLUG_PATTERN.test(input.slug) || input.slug.length > 160) return { ok: false, error: "Use a lowercase slug with letters, numbers, and hyphens." };
  const title = clean(input.title, 240);
  const body = clean(input.body, 50000);
  if (!title || !body) return { ok: false, error: "A title and body are required." };
  const publishedAt = input.publishedAt ? `${input.publishedAt}T12:00:00.000Z` : null;
  const { data: post, error } = await supabase.from("blog_posts").upsert({ id: input.id, slug: input.slug, title, excerpt: clean(input.excerpt, 600), body, is_published: Boolean(input.isPublished), published_at: input.isPublished ? publishedAt ?? new Date().toISOString() : publishedAt }).select().single();
  if (error) return { ok: false, error: error.code === "23505" ? "That slug is already in use." : "Could not save that blog entry." };
  if (!post) return { ok: false, error: "The entry was not returned after saving." };
  revalidatePath("/blog"); revalidatePath(`/blog/${input.slug}`); revalidatePath("/studio/blog"); revalidatePath("/sitemap.xml");
  return { ok: true, post };
}

export async function setBlogPublished(id: string, isPublished: boolean) {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  if (!UUID_PATTERN.test(id) || typeof isPublished !== "boolean") return { ok: false, error: "Invalid blog entry." };
  const { data, error } = await supabase.rpc("set_blog_published", { p_id: id, p_is_published: isPublished });
  if (error || !data) return { ok: false, error: "You do not have permission to change publication state." };
  revalidatePath("/blog"); revalidatePath("/studio/blog"); revalidatePath("/sitemap.xml");
  return { ok: true };
}

export async function deleteBlogPost(id: string) {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  if (!UUID_PATTERN.test(id)) return { ok: false, error: "Invalid blog entry." };
  const { data: allowed } = await supabase.rpc("is_blog_editor");
  if (!allowed) return { ok: false, error: "Only owners, admins, and developers can delete blog entries." };
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete that blog entry." };
  revalidatePath("/blog"); revalidatePath("/studio/blog"); revalidatePath("/sitemap.xml");
  return { ok: true };
}

function clean(value: string, max: number) { return String(value ?? "").trim().slice(0, max); }
