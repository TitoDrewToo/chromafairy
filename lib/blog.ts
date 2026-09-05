import type { BlogPost } from "./supabase/types";
import { createClient } from "./supabase/server";

export async function getBlogPosts(options: { publishedOnly?: boolean } = {}): Promise<BlogPost[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  let query = supabase.from("blog_posts").select("*").order("published_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
  if (options.publishedOnly ?? true) query = query.eq("is_published", true);
  const { data, error } = await query;
  return error ? [] : (data ?? []) as BlogPost[];
}

export async function getBlogPost(slug: string, publishedOnly = true): Promise<BlogPost | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  let query = supabase.from("blog_posts").select("*").eq("slug", slug);
  if (publishedOnly) query = query.eq("is_published", true);
  const singleQuery = query.maybeSingle();
  const { data, error } = await singleQuery;
  return error || !data ? null : data as BlogPost;
}

export function blogExcerpt(post: Pick<BlogPost, "excerpt" | "body">, max = 220) {
  const source = post.excerpt.trim() || post.body.replace(/\s+/g, " ").trim();
  return source.length > max ? `${source.slice(0, max).trimEnd()}…` : source;
}

export function blogDate(value: string | null) {
  if (!value) return "Unpublished";
  return new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

export function blogYear(post: BlogPost) {
  return new Date(post.published_at ?? post.created_at).getUTCFullYear();
}

export function blogParagraphs(body: string) {
  return body.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
}
