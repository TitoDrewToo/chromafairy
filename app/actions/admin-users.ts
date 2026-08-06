"use server";

import { createAdminClient } from "../../lib/supabase/admin";
import { createClient } from "../../lib/supabase/server";
import type { UserRole } from "../../lib/supabase/types";

const roles: UserRole[] = ["owner", "admin", "developer"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function inviteAdminUser(emailInput: string, role: UserRole) {
  const email = emailInput.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email) || !roles.includes(role)) return { ok: false, error: "Enter a valid email and role." };
  const caller = await createClient();
  if (!caller) return { ok: false, error: "Supabase is not configured." };
  const { data: canManageUsers } = await caller.rpc("is_user_manager");
  if (!canManageUsers) return { ok: false, error: "Only owners, developers, and admins can manage users." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "The server invitation service is not configured." };
  const { absoluteUrl } = await import("../../lib/site");
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: absoluteUrl("/studio/set-password?mode=invite") });
  if (error || !data.user) return { ok: false, error: "Could not send the invitation." };
  const { error: profileError } = await admin.from("profiles").upsert({ id: data.user.id, email, full_name: null, role });
  if (profileError) return { ok: false, error: "Invitation sent, but the profile role could not be saved." };
  return { ok: true };
}

export async function updateAdminUserRole(userId: string, role: UserRole) {
  if (!UUID_PATTERN.test(userId) || !roles.includes(role)) return { ok: false, error: "Invalid user or role." };
  const caller = await createClient();
  if (!caller) return { ok: false, error: "Supabase is not configured." };
  const { data: canManageUsers } = await caller.rpc("is_user_manager");
  if (!canManageUsers) return { ok: false, error: "Only owners, developers, and admins can manage users." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "The server user-management service is not configured." };
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  return error ? { ok: false, error: "Could not update that role." } : { ok: true };
}

export async function removeAdminUser(userId: string) {
  if (!UUID_PATTERN.test(userId)) return { ok: false, error: "Invalid user." };
  const caller = await createClient();
  if (!caller) return { ok: false, error: "Supabase is not configured." };
  const { data: { user } } = await caller.auth.getUser();
  if (!user || user.id === userId) return { ok: false, error: "You cannot remove the signed-in user." };
  const { data: canManageUsers } = await caller.rpc("is_user_manager");
  if (!canManageUsers) return { ok: false, error: "Only owners, developers, and admins can manage users." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "The server user-management service is not configured." };
  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) return { ok: false, error: "Could not remove that user." };
  const { error: profileError } = await admin.from("profiles").delete().eq("id", userId);
  return profileError ? { ok: false, error: "The auth user was removed, but the profile cleanup needs attention." } : { ok: true };
}
