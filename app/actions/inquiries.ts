"use server";

import { headers } from "next/headers";
import { createAdminClient } from "../../lib/supabase/admin";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 5;
const inquiryAttempts = new Map<string, { count: number; startedAt: number }>();

type InquiryInput = {
  kind: "piece" | "commission";
  workId?: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  honeypot?: string;
  startedAt: number;
};

export async function submitInquiry(input: InquiryInput): Promise<{ ok: boolean; error?: string }> {
  if (!input || (input.kind !== "piece" && input.kind !== "commission")) return { ok: false, error: "Please check the inquiry details." };
  if (input.honeypot || !Number.isFinite(input.startedAt) || Date.now() - input.startedAt < 1200) return { ok: true };

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";
  if (!name || name.length > 100 || !EMAIL_PATTERN.test(email) || email.length > 254 || phone.length > 40 || message.length > 3000 || (input.kind === "commission" && !message)) {
    return { ok: false, error: "Please check your name, email, and message." };
  }

  const requestHeaders = await headers();
  const address = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowInquiry(`${address}:${email}`)) return { ok: false, error: "Too many inquiries from this address. Please try again later." };

  const supabase = await import("../../lib/supabase/server").then(({ createClient }) => createClient());
  if (!supabase) return { ok: false, error: "The inquiry form is temporarily unavailable." };

  let workId: string | null = null;
  let workTitleSnapshot: string | null = null;
  if (input.kind === "piece") {
    if (!input.workId || !UUID_PATTERN.test(input.workId)) return { ok: false, error: "This work is not available for inquiry." };
    const { data: work } = await supabase.from("works").select("id, title").eq("id", input.workId).neq("status", "draft").maybeSingle();
    if (!work) return { ok: false, error: "This work is not available for inquiry." };
    workId = work.id;
    workTitleSnapshot = work.title;
  }

  const inquiryId = crypto.randomUUID();
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "The inquiry form is temporarily unavailable." };
  const { error } = await admin.from("inquiries").insert({
    id: inquiryId,
    type: input.kind,
    work_id: workId,
    work_title_snapshot: workTitleSnapshot,
    name,
    email,
    phone: phone || null,
    message: message || null,
    size_pref: null,
    palette_pref: null,
    space_for: null,
    budget_range: null,
    timeline: null,
    source: input.kind === "piece" ? "shop" : "home",
    status: "new",
    archived_at: null,
    notified_at: null,
  });
  if (error) return { ok: false, error: "We couldn’t send that just now. Please try again." };

  await notifyInquiry({ inquiryId, type: input.kind, name, email, phone, message, workTitle: workTitleSnapshot });
  return { ok: true };
}

function allowInquiry(key: string) {
  const now = Date.now();
  for (const [storedKey, attempt] of inquiryAttempts) if (now - attempt.startedAt > RATE_WINDOW_MS) inquiryAttempts.delete(storedKey);
  const attempt = inquiryAttempts.get(key);
  if (!attempt || now - attempt.startedAt > RATE_WINDOW_MS) {
    inquiryAttempts.set(key, { count: 1, startedAt: now });
    return true;
  }
  if (attempt.count >= RATE_LIMIT) return false;
  attempt.count += 1;
  return true;
}

type InquiryNotification = {
  inquiryId: string;
  type: "piece" | "commission";
  name: string;
  email: string;
  phone: string;
  message: string;
  workTitle: string | null;
};

async function notifyInquiry(details: InquiryNotification) {
  if (!UUID_PATTERN.test(details.inquiryId)) return;

  // Send the studio notification email via Resend. Best-effort: a failed email
  // must never break the already-saved inquiry.
  let sent = false;
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("[inquiry-notification] RESEND_API_KEY not set; skipping email.");
    } else {
      const to = process.env.INQUIRY_NOTIFY_TO || "hello@chromafairy.com";
      const from = process.env.INQUIRY_NOTIFY_FROM || "Chroma Fairy <hello@chromafairy.com>";
      const body = [
        `New ${details.type} inquiry`,
        "",
        `Name:  ${details.name}`,
        `Email: ${details.email}`,
        details.phone ? `Phone: ${details.phone}` : null,
        details.workTitle ? `Work:  ${details.workTitle}` : null,
        "",
        details.message ? `Message:\n${details.message}` : "(no message)",
      ].filter((line): line is string => line !== null).join("\n");

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          reply_to: details.email,
          subject: `New ${details.type} inquiry from ${details.name}`,
          text: body,
        }),
      });
      if (response.ok) sent = true;
      else console.error("[inquiry-notification] Resend send failed:", response.status, await response.text().catch(() => ""));
    }
  } catch (err) {
    console.error("[inquiry-notification] Email error:", err instanceof Error ? err.message : err);
  }

  // Record that we notified, only when the email actually went out.
  if (!sent) return;
  const admin = createAdminClient();
  if (!admin) return;
  const { error } = await admin
    .from("inquiries")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", details.inquiryId)
    .is("notified_at", null);
  if (error) console.error("[inquiry-notification] Could not mark inquiry notified:", error.message);
}
