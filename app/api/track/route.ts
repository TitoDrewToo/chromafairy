import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { createAdminClient } from "../../../lib/supabase/admin";

const MAX_BODY_BYTES = 512;
const BOT_PATTERN = /bot|crawler|spider|preview|headless|lighthouse/i;

function emptyResponse() {
  return new Response(null, { status: 204 });
}

export async function POST(request: NextRequest) {
  try {
    if (request.cookies.get("cf_no_track")?.value === "1") return emptyResponse();

    const body = await request.arrayBuffer();
    if (body.byteLength > MAX_BODY_BYTES) return emptyResponse();

    const userAgent = request.headers.get("user-agent") ?? "";
    if (BOT_PATTERN.test(userAgent)) return emptyResponse();

    const payload = JSON.parse(new TextDecoder().decode(body)) as { path?: unknown; referrer?: unknown };
    const path = typeof payload.path === "string" ? payload.path : "";
    if (!path.startsWith("/") || path.length >= 200 || path.includes("://")) return emptyResponse();
    if (path === "/studio" || path.startsWith("/studio/")) return emptyResponse();

    const salt = process.env.PAGE_VIEW_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!salt) return emptyResponse();

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";
    const utcDate = new Date().toISOString().slice(0, 10);
    const visitorHash = createHash("sha256")
      .update(`${ip}|${userAgent}|${salt}|${utcDate}`)
      .digest("hex");
    const referrer = typeof payload.referrer === "string" ? payload.referrer.slice(0, 300) : null;
    const supabase = createAdminClient();
    if (supabase) await supabase.from("page_views").insert({ path, referrer, visitor_hash: visitorHash });
  } catch {
    // Analytics must never affect a visitor or disclose server-side errors.
  }

  return emptyResponse();
}
