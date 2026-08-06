"use server";

import { createClient } from "../../lib/supabase/server";

export async function updateFeatureFlag(key: string, enabled: boolean) {
  if (!/^[a-z][a-z0-9_]{1,63}$/.test(key) || typeof enabled !== "boolean") return { ok: false, error: "Invalid feature flag." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { data: allowed } = await supabase.rpc("is_owner_or_developer");
  if (!allowed) return { ok: false, error: "Only owners and developers can change feature flags." };
  const { error } = await supabase.from("feature_flags").update({ enabled }).eq("key", key);
  return error ? { ok: false, error: "Could not update that flag." } : { ok: true };
}
