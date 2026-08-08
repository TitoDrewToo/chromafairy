import { notFound } from "next/navigation";
import SystemsAdmin from "../../../../components/admin-systems";
import { createClient } from "../../../../lib/supabase/server";
import "../../admin.css";
import "../../operations.css";

export const dynamic = "force-dynamic";

export default async function SystemsPage() {
  const supabase = await createClient();
  if (!supabase) return <SystemsMessage message="Systems monitoring is not configured." />;
  const { data: allowed } = await supabase.rpc("is_user_manager");
  if (!allowed) notFound();
  const { data: groups, error } = await supabase.from("error_groups").select("*").order("last_seen", { ascending: false });
  if (error) return <SystemsMessage message="Systems monitoring could not be loaded." />;
  return <div className="admin-dashboard admin-operations-page systems-page"><p className="admin-eyebrow">Studio systems</p><h1>Error monitoring</h1><p className="admin-muted">Observation mode: review captured issues and proposed diagnoses. No fixes execute from here.</p><SystemsAdmin initialGroups={(groups ?? []) as import("../../../../lib/supabase/types").ErrorGroup[]} /></div>;
}

function SystemsMessage({ message }: { message: string }) { return <div className="admin-dashboard"><p className="admin-eyebrow">Studio systems</p><h1>Error monitoring</h1><p className="admin-muted">{message}</p></div>; }
