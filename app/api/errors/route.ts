import { NextRequest, NextResponse } from "next/server";
import { captureServerError } from "../../../lib/error-capture";
import { createAdminClient } from "../../../lib/supabase/admin";
import { sanitizeErrorContext, sanitizeErrorString } from "../../../lib/error-sanitize";

const MAX_BODY_BYTES = 32 * 1024;
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const buckets = new Map<string, { startedAt: number; count: number }>();

function stringField(value: unknown, maxLength: number) { return typeof value === "string" && value.trim() ? sanitizeErrorString(value, maxLength) : null; }

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return NextResponse.json({ ok: false }, { status: 413 });
    let body: Record<string, unknown>;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid payload");
      body = parsed as Record<string, unknown>;
    } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

    const admin = createAdminClient();
    let userId: string | null = null;
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (admin && token) {
      const { data: { user } } = await admin.auth.getUser(token);
      userId = user?.id ?? null;
    }
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    const rateKey = userId ?? ip;
    const now = Date.now();
    const bucket = buckets.get(rateKey);
    if (!bucket || now - bucket.startedAt >= WINDOW_MS) buckets.set(rateKey, { startedAt: now, count: 1 });
    else if (bucket.count >= MAX_REQUESTS) return NextResponse.json({ ok: false }, { status: 429 });
    else bucket.count += 1;

    const message = stringField(body.message, 2_000);
    if (!message) return NextResponse.json({ ok: false }, { status: 400 });
    captureServerError({
      userId,
      tool: stringField(body.tool, 120),
      fn: stringField(body.fn, 160),
      action: stringField(body.action, 160),
      route: stringField(body.route, 500),
      level: body.level === "warn" || body.level === "info" ? body.level : "error",
      message,
      stack: stringField(body.stack, 8_000),
      context: sanitizeErrorContext(body.context),
      release: stringField(body.release, 120),
      environment: stringField(body.environment, 80),
    });
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    // Error capture must be self-safe and never create a recursive failure.
    return NextResponse.json({ ok: true }, { status: 202 });
  }
}
