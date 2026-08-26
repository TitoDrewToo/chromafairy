import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import HomeClient from "../components/home-client";
import type { HomeShopPreviewItem } from "../components/home-shop-preview";
import { absoluteUrl } from "../lib/site";
import { getArtworkUrl } from "../lib/catalogue";
import { createClient } from "../lib/supabase/server";
import { getLandingPageContent } from "../lib/landing-page";
import { injectLandingMarkup } from "../lib/landing-page-html";

export const metadata: Metadata = {
  title: "Chroma Fairy",
  description: "Discover Samantha Ty’s fluid abstract paintings, commissions, exhibitions, and original works from the Philippines.",
  alternates: { canonical: "/" },
  openGraph: { title: "Chroma Fairy", description: "Fluid abstract paintings shaped by water, movement, and nature.", url: absoluteUrl("/"), images: [{ url: absoluteUrl("/fairy-logo-option-v2.png"), alt: "Chroma Fairy" }] },
  twitter: { card: "summary_large_image", title: "Chroma Fairy", description: "Fluid abstract paintings shaped by water, movement, and nature.", images: [absoluteUrl("/fairy-logo-option-v2.png")] },
};

function getHomeSource() {
  const source = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf8");
  const styles = source.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
  const body = source.match(/<body>([\s\S]*?)<script>/)?.[1] ?? "";
  const markup = body
    .replace(/\s*<canvas id="art"><\/canvas>\s*<div id="artFallback"><\/div>/, "")
    .replaceAll('src="assets/', 'src="/assets/')
    .replace('      <a href="#contact">Contact</a>', '      <a href="#contact">Contact</a>\n      <a href="/shop">Shop</a>')
    .replace('<div class="brand2">Samantha Ty</div>', '<div class="brand2">Samantha Ty</div>');

  return { styles, markup };
}

export default async function HomePage() {
  const source = getHomeSource();
  const [content, shopPreview] = await Promise.all([getLandingPageContent({ publishedOnly: true }), getHomeShopPreview()]);
  return <HomeClient {...source} markup={injectLandingMarkup(source.markup, content)} shopPreview={shopPreview} />;
}

async function getHomeShopPreview(): Promise<HomeShopPreviewItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data: works, error: worksError } = await supabase
    .from("works")
    .select("id, title, created_at")
    .neq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(5);
  if (worksError || !works?.length) return [];

  const { data: images, error: imagesError } = await supabase
    .from("work_images")
    .select("work_id, storage_path, alt, is_primary, display_order")
    .in("work_id", works.map((work) => work.id))
    .order("is_primary", { ascending: false })
    .order("display_order", { ascending: true });
  if (imagesError) return [];

  const imageByWork = new Map<string, (typeof images)[number]>();
  for (const image of images ?? []) if (!imageByWork.has(image.work_id)) imageByWork.set(image.work_id, image);
  return works.flatMap((work) => {
    const image = imageByWork.get(work.id);
    return image ? [{ title: work.title, imageUrl: getArtworkUrl(supabase, image.storage_path), alt: image.alt ?? work.title }] : [];
  });
}
