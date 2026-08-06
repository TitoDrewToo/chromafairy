"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

export async function signOutAdmin() {
  const supabase = await createClient();
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) console.warn("Admin sign-out failed server-side:", error.message);
  }
  redirect("/admin/login");
}
