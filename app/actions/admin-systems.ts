"use server";

import { createAdminClient } from "../../lib/supabase/admin";
import { createClient } from "../../lib/supabase/server";
import type { ReviewVerdict } from "../../lib/supabase/types";

const statuses = ["new", "triaged", "resolved"] as const;
const verdicts: ReviewVerdict[] = ["matched", "partial", "wrong"];

async function canManage() {
  const caller = await createClient();
  if (!caller) return false;
  const { data } = await caller.rpc("is_user_manager");
  return data === true;
}

export async function updateErrorGroupStatus(fingerprint: string, status: string) {
  if (!/^[a-z0-9-]{1,128}$/i.test(fingerprint) || !statuses.includes(status as typeof statuses[number])) return { ok: false, error: "Invalid systems update." };
  if (!(await canManage())) return { ok: false, error: "Not authorized." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Systems service is not configured." };
  const { error } = await admin.from("error_groups").update({ status }).eq("fingerprint", fingerprint);
  return error ? { ok: false, error: "Could not update issue status." } : { ok: true };
}

export async function updateErrorReview(fingerprint: string, verdict: ReviewVerdict | null) {
  if (!/^[a-z0-9-]{1,128}$/i.test(fingerprint) || (verdict !== null && !verdicts.includes(verdict))) return { ok: false, error: "Invalid review." };
  const caller = await createClient();
  if (!caller) return { ok: false, error: "Supabase is not configured." };
  const { data: { user } } = await caller.auth.getUser();
  if (!user || !(await canManage())) return { ok: false, error: "Not authorized." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Systems service is not configured." };
  const { error } = await admin.from("error_groups").update({ review_verdict: verdict, reviewed_at: verdict ? new Date().toISOString() : null, reviewed_by: verdict ? user.id : null }).eq("fingerprint", fingerprint);
  return error ? { ok: false, error: "Could not save review." } : { ok: true };
}
