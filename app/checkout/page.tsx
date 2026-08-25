import Link from "next/link";
import { createClient } from "../../lib/supabase/server";
import "../shop/shop.css";

export const dynamic = "force-dynamic";

export default async function CheckoutStub({ searchParams }: { searchParams: Promise<{ work?: string }> }) {
  const { work: slug } = await searchParams;
  const supabase = await createClient();
  const [{ data: flag }, { data: piece }] = await Promise.all([
    supabase?.from("public_feature_flags").select("enabled").eq("key", "payments").maybeSingle() ?? Promise.resolve({ data: null }),
    supabase && slug ? supabase.from("works").select("title").eq("slug", slug).neq("status", "draft").maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return <main className="shop-shell"><div className="shop-frame shop-empty"><div className="shop-eyebrow">Checkout preview</div><h1 className="shop-product-title">{flag?.enabled && piece ? `Buy ${piece.title}` : "Checkout unavailable"}</h1><p>{flag?.enabled && piece ? "Online checkout is staged here for PayMongo activation." : "Online checkout is not currently available."}</p><Link className="shop-link chroma-text" href={piece ? `/shop/${slug}` : "/shop"}>Return to the shop</Link></div></main>;
}
