"use server";

import { createAdminClient } from "../../lib/supabase/admin";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Notification seam for inquiries. Email delivery is intentionally deferred;
 * this records that the notification hook ran so an email provider can be
 * added without changing either public form.
 */
export async function notifyInquiry(inquiryId: string): Promise<{ ok: boolean }> {
  if (!UUID_PATTERN.test(inquiryId)) return { ok: false };

  const admin = createAdminClient();
  if (!admin) {
    console.warn("[inquiry-notification-stub] Admin client unavailable; email provider TODO.");
    return { ok: false };
  }

  const { error } = await admin
    .from("inquiries")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", inquiryId)
    .is("notified_at", null);

  if (error) {
    console.error("[inquiry-notification-stub] Could not mark inquiry notified:", error.message);
    return { ok: false };
  }

  console.info("[inquiry-notification-stub] Inquiry recorded; email provider TODO.", { inquiryId });
  return { ok: true };
}
