"use client";

import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

export default function AdminSignOut() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return <button className="admin-sign-out" onClick={signOut} type="button">Sign out</button>;
}
