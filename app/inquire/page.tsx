import Link from "next/link";
import InquiryForm from "../../components/inquiry-form";
import { createClient } from "../../lib/supabase/server";
import "../shop/shop.css";

export const dynamic = "force-dynamic";

export default async function InquirePage({ searchParams }: { searchParams: Promise<{ work?: string }> }) {
  const { work: slug } = await searchParams;
  const supabase = await createClient();
  const { data: piece } = supabase && slug
    ? await supabase.from("works").select("id, title, slug").eq("slug", slug).neq("status", "draft").maybeSingle()
    : { data: null };

  return (
    <main className="shop-shell">
      <div className="shop-frame shop-product">
        <Link className="shop-back shop-product-back chroma-text" href="/shop">← Back to catalogue</Link>
        {piece ? (
          <div className="shop-inquiry-page">
            <div className="shop-eyebrow">Piece inquiry</div>
            <h1 className="shop-product-title">{piece.title}</h1>
            <p className="shop-inquiry-intro">Ask Samantha about this work, availability, or bringing its feeling into your space.</p>
            <InquiryForm kind="piece" workId={piece.id} workTitle={piece.title} />
          </div>
        ) : (
          <div className="shop-empty">
            This work is no longer available for inquiry.
            <div><Link className="shop-link chroma-text" href="/shop">Return to the catalogue</Link></div>
          </div>
        )}
      </div>
    </main>
  );
}
