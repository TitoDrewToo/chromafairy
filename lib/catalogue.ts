import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";

export function formatPrice(work: { price_php: number | null; price_usd: number | null; price_on_request: boolean | null }) {
  if (work.price_on_request) return "Price on request";
  if (work.price_php === null && work.price_usd === null) return "Price on request";

  const php = work.price_php === null ? null : `₱${Math.round(work.price_php).toLocaleString("en-PH")}`;
  const usd = work.price_usd === null ? null : `~$${Math.round(work.price_usd).toLocaleString("en-US")}`;
  return [php, usd ? `(${usd})` : null].filter(Boolean).join(" ");
}

export function getArtworkUrl(supabase: SupabaseClient<Database>, storagePath: string) {
  if (/^https?:\/\//i.test(storagePath)) return storagePath;
  return supabase.storage.from("artwork").getPublicUrl(storagePath).data.publicUrl;
}
