"use server";

import { createAdminClient } from "../../lib/supabase/admin";
import { createClient } from "../../lib/supabase/server";
import type { InquiryStatus } from "../../lib/supabase/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statuses: InquiryStatus[] = ["new", "replied", "closed"];

export async function updateAdminInquiry(input: {
  inquiryId: string;
  status?: InquiryStatus;
  archived?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  if (!input || !UUID_PATTERN.test(input.inquiryId)) return { ok: false, error: "Invalid inquiry." };
  if (input.status !== undefined && !statuses.includes(input.status)) return { ok: false, error: "Invalid inquiry status." };
  if (input.status === undefined && input.archived === undefined) return { ok: false, error: "No inquiry change provided." };

  const caller = await createClient();
  if (!caller) return { ok: false, error: "Supabase is not configured." };
  const { data: isAdmin } = await caller.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Not authorized." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "The studio service is not configured." };

  const update = {
    ...(input.status === undefined ? {} : { status: input.status }),
    ...(input.archived === undefined ? {} : { archived_at: input.archived ? new Date().toISOString() : null }),
  };
  const { error } = await admin.from("inquiries").update(update).eq("id", input.inquiryId);
  if (error) return { ok: false, error: "Could not update inquiry." };
  return { ok: true };
}
