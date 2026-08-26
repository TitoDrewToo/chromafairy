import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "../../lib/supabase/server";
import { getArtworkUrl } from "../../lib/catalogue";
import ShopCatalogue, { type CatalogueImage, type CatalogueWork } from "../../components/shop-catalogue";
import ShopSkeleton from "../../components/shop-skeleton";
import { absoluteUrl } from "../../lib/site";
import "./shop.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Original Fluid Art",
  description: "Browse original fluid abstract paintings by Samantha Ty, including available, reserved, and sold works.",
  alternates: { canonical: "/shop" },
  openGraph: { title: "Original Fluid Art · Chroma Fairy", description: "Browse Samantha Ty’s original fluid abstract paintings.", url: absoluteUrl("/shop"), images: [{ url: absoluteUrl("/fairy-logo-option-v2.png"), alt: "Chroma Fairy" }] },
  twitter: { card: "summary_large_image", title: "Original Fluid Art · Chroma Fairy", description: "Browse Samantha Ty’s original fluid abstract paintings.", images: [absoluteUrl("/fairy-logo-option-v2.png")] },
};

export default function ShopPage() {
  return (
    <main className="shop-shell">
      <div className="shop-frame">
          <header className="shop-header">
            <Link className="shop-back chroma-text" href="/">← Back home</Link>
            <Link aria-label="Chroma Fairy home" className="shop-brand chroma-text" href="/">
              <img alt="Chroma Fairy" src="/fairy-logo-option-v2.png" />
            </Link>
          </header>
          <section className="shop-intro">
            <div><div className="shop-kicker">Samantha Ty · Original works</div></div>
            <p className="shop-intro-note">Pieces shaped by water, movement, and the quiet force of nature.</p>
          </section>
          <Suspense fallback={<ShopSkeleton />}>
            <ShopData />
          </Suspense>
          <footer className="shop-footer">Chroma Fairy · Fluid abstract artist · Philippines</footer>
      </div>
    </main>
  );
}

async function ShopData() {
  const supabase = await createClient();
  if (!supabase) return <ShopMessage message="The catalogue is temporarily unavailable." />;

  const { data: works, error: worksError } = await supabase.from("works").select("*").neq("status", "draft");
  if (worksError) return <ShopMessage message="The catalogue is temporarily unavailable." />;

  const [{ data: series }, { data: images }] = await Promise.all([
    supabase.from("series").select("id, name").eq("is_published", true),
    works.length ? supabase.from("work_images").select("work_id, storage_path, alt, is_primary").in("work_id", works.map((work) => work.id)).order("is_primary", { ascending: false }).order("display_order", { ascending: true }) : Promise.resolve({ data: [], error: null }),
  ]);
  const seriesById = new Map((series ?? []).map((item) => [item.id, item]));
  const imagesByWork = new Map<string, CatalogueImage[]>();
  (images ?? []).forEach((image) => imagesByWork.set(image.work_id, [
    ...(imagesByWork.get(image.work_id) ?? []),
    { ...image, storage_path: getArtworkUrl(supabase, image.storage_path) } as CatalogueImage,
  ]));

  const catalogueWorks: CatalogueWork[] = works.map((work) => ({
    id: work.id,
    title: work.title,
    slug: work.slug,
    year: work.year,
    month: work.month,
    status: work.status as CatalogueWork["status"],
    is_new: work.is_new,
    price_php: work.price_php,
    price_usd: work.price_usd,
    price_on_request: work.price_on_request,
    series_id: work.series_id,
    series_name: work.series_id ? seriesById.get(work.series_id)?.name ?? null : null,
    width: work.width,
    height: work.height,
    depth: work.depth,
    dimension_unit: work.dimension_unit,
    images: imagesByWork.get(work.id) ?? [],
  }));

  return <ShopCatalogue works={catalogueWorks} />;
}

function ShopMessage({ message }: { message: string }) {
  return <div className="shop-empty">{message}</div>;
}
