import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { formatPrice, getArtworkUrl } from "../../../lib/catalogue";
import ShopImage from "../../../components/shop-image";
import "../shop.css";

export const dynamic = "force-dynamic";

export default async function WorkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  if (!supabase) return <ProductMessage message="This work is temporarily unavailable." />;

  const { data: work, error } = await supabase.from("works").select("*").eq("slug", slug).neq("status", "draft").maybeSingle();
  if (error || !work) notFound();

  const [{ data: images }, { data: series }] = await Promise.all([
    supabase.from("work_images").select("storage_path, alt, is_primary").eq("work_id", work.id).order("is_primary", { ascending: false }).order("display_order", { ascending: true }),
    work.series_id ? supabase.from("series").select("name").eq("id", work.series_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  const gallery = (images ?? []).map((image) => ({ ...image, storage_path: getArtworkUrl(supabase, image.storage_path) }));
  const dimensions = [work.width, work.height, work.depth].filter((dimension): dimension is number => dimension !== null).join(" × ");
  const status = work.status === "sold" ? "Sold" : work.status === "reserved" ? "Reserved" : work.is_new ? "Available · New" : "Available";

  return (
    <main className="shop-shell">
      <div className="shop-frame shop-product">
        <Link className="shop-back shop-product-back chroma-text" href="/shop">← Back to catalogue</Link>
        <div className="shop-product-layout">
          <div className="shop-gallery">
            {gallery.length ? gallery.map((image) => <div className="shop-gallery-frame" key={image.storage_path}><ShopImage alt={image.alt ?? work.title} src={image.storage_path} /></div>) : <div className="shop-gallery-frame"><ShopImage alt={work.title} /></div>}
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
            <Link className="shop-inquire inquiry-chroma-button" href={`/inquire?work=${encodeURIComponent(work.slug)}`}><span className="inquiry-chroma-label">Inquire about this work</span></Link>
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
