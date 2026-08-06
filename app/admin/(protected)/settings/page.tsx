import { createClient } from "../../../../lib/supabase/server";
import SettingsAdmin from "../../../../components/admin-settings";
import "../../admin.css";
import "../../operations.css";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  if (!supabase) return <AdminMessage message="Supabase is not configured." />;
  const { data: flags, error } = await supabase.from("feature_flags").select("key, enabled, notes, updated_at").order("key");
  if (error) return <AdminMessage message="Feature flags could not be loaded." />;
  return <div className="admin-dashboard admin-operations-page"><p className="admin-eyebrow">Studio controls</p><h1>Settings</h1><p className="admin-muted">Feature flags are off by default and activate deliberately.</p><SettingsAdmin initialFlags={flags ?? []} /></div>;
}

function AdminMessage({ message }: { message: string }) { return <div className="admin-dashboard"><p className="admin-eyebrow">Studio controls</p><h1>Settings</h1><p className="admin-muted">{message}</p></div>; }
