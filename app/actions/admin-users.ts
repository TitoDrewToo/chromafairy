"use server";

import { createAdminClient } from "../../lib/supabase/admin";
import { createClient } from "../../lib/supabase/server";
import type { UserRole } from "../../lib/supabase/types";

const roles: UserRole[] = ["owner", "admin", "staff", "developer"];

export async function inviteAdminUser(emailInput: string, role: UserRole) {
  const email = emailInput.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email) || !roles.includes(role)) return { ok: false, error: "Enter a valid email and role." };
  const caller = await createClient();
  if (!caller) return { ok: false, error: "Supabase is not configured." };
  const { data: canManageUsers } = await caller.rpc("is_owner_or_developer");
  if (!canManageUsers) return { ok: false, error: "Only owners and developers can manage users." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "The server invitation service is not configured." };
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
  if (error || !data.user) return { ok: false, error: "Could not send the invitation." };
  const { error: profileError } = await admin.from("profiles").upsert({ id: data.user.id, email, full_name: null, role });
  if (profileError) return { ok: false, error: "Invitation sent, but the profile role could not be saved." };
  return { ok: true };
}
