import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { formatPrice, getArtworkUrl } from "../../../lib/catalogue";
import { absoluteUrl } from "../../../lib/site";
import ShopImage from "../../../components/shop-image";
import WorkInquiryModal from "../../../components/work-inquiry-modal";
import "../shop.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  if (!supabase) return { title: "Original work" };
  const { data: work } = await supabase.from("works").select("id, title, year, description, slug").eq("slug", slug).neq("status", "draft").maybeSingle();
  if (!work) return { title: "Work not found" };
  const { data: image } = await supabase.from("work_images").select("storage_path, alt").eq("work_id", work.id).order("is_primary", { ascending: false }).order("display_order").limit(1).maybeSingle();
  const imageUrl = image ? getArtworkUrl(supabase, image.storage_path) : absoluteUrl("/fairy-logo-option-v2.png");
  const description = work.description || `${work.title}, an original fluid abstract painting by Samantha Ty from ${work.year}.`;
  return { title: work.title, description, alternates: { canonical: `/shop/${work.slug}` }, openGraph: { type: "website", title: `${work.title} · Chroma Fairy`, description, url: absoluteUrl(`/shop/${work.slug}`), images: [{ url: imageUrl, alt: image?.alt || work.title }] }, twitter: { card: "summary_large_image", title: `${work.title} · Chroma Fairy`, description, images: [imageUrl] } };
}

export default async function WorkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  if (!supabase) return <ProductMessage message="This work is temporarily unavailable." />;

  const { data: work, error } = await supabase.from("works").select("*").eq("slug", slug).neq("status", "draft").maybeSingle();
  if (error || !work) notFound();

  const [{ data: images }, { data: series }, { data: paymentsFlag }] = await Promise.all([
    supabase.from("work_images").select("storage_path, alt, is_primary").eq("work_id", work.id).order("is_primary", { ascending: false }).order("display_order", { ascending: true }),
    work.series_id ? supabase.from("series").select("name").eq("id", work.series_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    supabase.from("public_feature_flags").select("enabled").eq("key", "payments").maybeSingle(),
  ]);
  const gallery = (images ?? []).map((image) => ({ ...image, storage_path: getArtworkUrl(supabase, image.storage_path) }));
  const dimensions = [work.width, work.height, work.depth].filter((dimension): dimension is number => dimension !== null).join(" × ");
  const status = work.status === "sold" ? "Sold" : work.status === "reserved" ? "Reserved" : work.is_new ? "Available · New" : "Available";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "VisualArtwork", name: work.title, creator: { "@type": "Person", name: "Samantha Ty" }, artMedium: work.medium || "Fluid abstract painting", dateCreated: String(work.year), image: gallery.map((image) => image.storage_path), description: work.description || undefined },
      { "@type": "Product", name: work.title, description: work.description || "Original fluid abstract painting by Samantha Ty.", image: gallery.map((image) => image.storage_path), sku: work.slug, offers: work.price_php !== null ? { "@type": "Offer", availability: work.status === "sold" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock", priceCurrency: "PHP", price: work.price_php, url: absoluteUrl(`/shop/${work.slug}`) } : undefined },
    ],
  };

  return (
    <main className="shop-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="shop-frame shop-product">
        <Link className="shop-back shop-product-back chroma-text" href="/shop">← Back to catalogue</Link>
        <div className="shop-product-layout">
          <div className="shop-gallery">
            {gallery.length ? gallery.map((image, index) => <div className="shop-gallery-frame" key={image.storage_path}><ShopImage alt={image.alt ?? work.title} fetchPriority={index === 0 ? "high" : "auto"} loading={index === 0 ? "eager" : "lazy"} sizes="(max-width: 860px) 100vw, 60vw" src={image.storage_path} /></div>) : <div className="shop-gallery-frame"><ShopImage alt={work.title} /></div>}
          </div>
          <article className="shop-product-info">
            <div className="shop-eyebrow">{series?.name ?? "Original work"} · {work.year}</div>
            <h1 className="shop-product-title">{work.title}</h1>
            <div className="shop-product-status">{status}</div>
            <div className="shop-product-price">{formatPrice(work)}</div>
            {work.description && <p className="shop-product-description">{work.description}</p>}
            <dl className="shop-specs">
              {work.medium && <div className="shop-spec"><dt>Medium</dt><dd>{work.medium}</dd></div>}
              {dimensions && <div className="shop-spec"><dt>Dimensions</dt><dd>{dimensions} {work.dimension_unit ?? ""}</dd></div>}
              <div className="shop-spec"><dt>Year</dt><dd>{work.year}</dd></div>
              {series?.name && <div className="shop-spec"><dt>Series</dt><dd>{series.name}</dd></div>}
            </dl>
            <WorkInquiryModal workId={work.id} workTitle={work.title} />
            {paymentsFlag?.enabled && <Link className="shop-buy inquiry-chroma-button" href={`/checkout?work=${encodeURIComponent(work.slug)}`}><span className="inquiry-chroma-label">Buy</span></Link>}
            <p className="shop-inquire-note">A personal response will follow with availability and details.</p>
          </article>
        </div>
      </div>
    </main>
  );
}

function ProductMessage({ message }: { message: string }) {
  return <main className="shop-shell"><div className="shop-frame shop-empty">{message}</div></main>;
}
