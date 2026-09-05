import type { MetadataRoute } from "next";
import { absoluteUrl } from "../lib/site";
import { createClient } from "../lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = [{ url: absoluteUrl("/"), changeFrequency: "monthly" as const, priority: 1 }, { url: absoluteUrl("/shop"), changeFrequency: "weekly" as const, priority: .9 }, { url: absoluteUrl("/blog"), changeFrequency: "weekly" as const, priority: .8 }];
  const supabase = await createClient();
  if (!supabase) return base;
  const { data: works } = await supabase.from("works").select("slug, updated_at").neq("status", "draft");
  const { data: posts } = await supabase.from("blog_posts").select("slug, updated_at").eq("is_published", true);
  return [...base, ...(works ?? []).map((work) => ({ url: absoluteUrl(`/shop/${work.slug}`), lastModified: work.updated_at ? new Date(work.updated_at) : undefined, changeFrequency: "monthly" as const, priority: .8 })), ...(posts ?? []).map((post) => ({ url: absoluteUrl(`/blog/${post.slug}`), lastModified: post.updated_at ? new Date(post.updated_at) : undefined, changeFrequency: "monthly" as const, priority: .7 }))];
}
