import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";

const SUPABASE_OBJECT_PATH = "/storage/v1/object/public/";
const SUPABASE_RENDER_PATH = "/storage/v1/render/image/public/";
export const ARTWORK_SRCSET_WIDTHS = [320, 640, 960, 1280] as const;

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

export function getArtworkTransformUrl(url: string, width: number, quality = 76) {
  if (!url.includes(SUPABASE_OBJECT_PATH)) return url;
  const transformed = new URL(url);
  transformed.pathname = transformed.pathname.replace(SUPABASE_OBJECT_PATH, SUPABASE_RENDER_PATH);
  transformed.searchParams.set("width", String(width));
  transformed.searchParams.set("resize", "contain");
  transformed.searchParams.set("quality", String(quality));
  transformed.searchParams.set("format", "webp");
  return transformed.toString();
}

export function getArtworkSrcSet(url: string, widths: readonly number[] = ARTWORK_SRCSET_WIDTHS) {
  if (!url.includes(SUPABASE_OBJECT_PATH)) return undefined;
  return widths.map((width) => `${getArtworkTransformUrl(url, width)} ${width}w`).join(", ");
}
