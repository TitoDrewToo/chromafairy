"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";
import { convertHeicToJpeg, isHeicFile } from "../../lib/server-image-conversion";
import { imageContentType, imageExtension, isCompatibleImageType } from "../../lib/image-types";
import { blogContentText, normalizeBlogContent, validBlogPath } from "../../lib/blog-content";
import type { BlogContent } from "../../lib/blog-content";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type BlogInput = { id: string; slug: string; title: string; excerpt: string; body: string; content: BlogContent; isPublished: boolean; publishedAt: string };

export async function upsertBlogPost(input: BlogInput) {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { data: allowed } = await supabase.rpc("is_blog_editor");
  if (!allowed) return { ok: false, error: "Only owners, admins, and developers can edit blog entries." };
  if (!UUID_PATTERN.test(input.id) || !SLUG_PATTERN.test(input.slug) || input.slug.length > 160) return { ok: false, error: "Use a lowercase slug with letters, numbers, and hyphens." };
  const title = clean(input.title, 240);
  const content = normalizeBlogContent(input.content, input.id);
  const body = clean(blogContentText(content) || input.body, 50000);
  if (!title || !body) return { ok: false, error: "A title and body are required." };
  const publishedAt = input.publishedAt ? `${input.publishedAt}T12:00:00.000Z` : null;
  const { data: post, error } = await supabase.from("blog_posts").upsert({ id: input.id, slug: input.slug, title, excerpt: clean(input.excerpt, 600), body, content, is_published: Boolean(input.isPublished), published_at: input.isPublished ? publishedAt ?? new Date().toISOString() : publishedAt }).select().single();
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
  const { data: existing } = await supabase.from("blog_posts").select("content").eq("id", id).maybeSingle();
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete that blog entry." };
  const paths = existing ? normalizeBlogContent(existing.content, id).blocks.flatMap((block) => "path" in block && validBlogPath(block.path, id) ? [block.path] : []) : [];
  if (paths.length) await supabase.storage.from("artwork").remove(paths);
  revalidatePath("/blog"); revalidatePath("/studio/blog"); revalidatePath("/sitemap.xml");
  return { ok: true };
}

export async function uploadBlogImage(input: { postId: string; file: File }) {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { data: allowed } = await supabase.rpc("is_blog_editor");
  if (!allowed || !UUID_PATTERN.test(input.postId)) return { ok: false, error: "Not authorized." };
  const extension = imageExtension(input.file?.name);
  const isHeic = isHeicFile(input.file);
  const contentType = imageContentType(extension);
  if (!input.file || input.file.size <= 0 || input.file.size > 10 * 1024 * 1024 || (!isHeic && !isCompatibleImageType(input.file.type, contentType, extension))) return { ok: false, error: "Use a JPG, PNG, WebP, GIF, HEIC, or HEIF image up to 10 MB." };
  let body: File | Buffer = input.file;
  let uploadType = contentType ?? "application/octet-stream";
  if (isHeic) {
    try { body = await convertHeicToJpeg(input.file); uploadType = "image/jpeg"; } catch { return { ok: false, error: "HEIC could not be converted. Please use a JPG or PNG copy." }; }
  }
  const extensionToStore = isHeic || extension === "jpeg" ? "jpg" : extension;
  const path = `blog/${input.postId}/${crypto.randomUUID()}.${extensionToStore}`;
  const { error } = await supabase.storage.from("artwork").upload(path, body, { contentType: uploadType, upsert: false });
  return error ? { ok: false, error: "Could not upload that image." } : { ok: true, path };
}

export async function removeBlogImage(postId: string, path: string) {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { data: allowed } = await supabase.rpc("is_blog_editor");
  if (!allowed || !UUID_PATTERN.test(postId) || !validBlogPath(path, postId)) return { ok: false, error: "Not authorized." };
  const { error } = await supabase.storage.from("artwork").remove([path]);
  return error ? { ok: false, error: "Could not remove that image." } : { ok: true };
}

function clean(value: string, max: number) { return String(value ?? "").trim().slice(0, max); }
