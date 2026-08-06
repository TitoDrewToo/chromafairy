import type { MetadataRoute } from "next";
import { absoluteUrl } from "../lib/site";
import { createClient } from "../lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = [{ url: absoluteUrl("/"), changeFrequency: "monthly" as const, priority: 1 }, { url: absoluteUrl("/shop"), changeFrequency: "weekly" as const, priority: .9 }];
  const supabase = await createClient();
  if (!supabase) return base;
  const { data: works } = await supabase.from("works").select("slug, updated_at").neq("status", "draft");
  return [...base, ...(works ?? []).map((work) => ({ url: absoluteUrl(`/shop/${work.slug}`), lastModified: work.updated_at ? new Date(work.updated_at) : undefined, changeFrequency: "monthly" as const, priority: .8 }))];
}
