import { createClient } from "../../../../lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SettingsAdmin from "../../../../components/admin-settings";
import { NO_TRACK_COOKIE } from "../../../../lib/studio-tracking-cookie";
import "../../admin.css";
import "../../operations.css";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  if (!supabase) return <AdminMessage message="Supabase is not configured." />;
  const { data: canManageSettings } = await supabase.rpc("is_user_manager");
  if (!canManageSettings) redirect("/studio");
  const { data: flags, error } = await supabase.from("feature_flags").select("key, enabled, notes, updated_at").order("key");
  if (error) return <AdminMessage message="Feature flags could not be loaded." />;
  const cookieStore = await cookies();
  const visitsExcluded = cookieStore.get("cf_no_track")?.value === "1";

  async function setVisitTracking(formData: FormData) {
    "use server";
    const actionClient = await createClient();
    if (!actionClient) return;
    const { data: allowed } = await actionClient.rpc("is_user_manager");
    if (!allowed) return;
    const actionCookies = await cookies();
    if (formData.get("countVisits") === "on") {
      actionCookies.delete("cf_no_track");
      actionCookies.set("cf_track_opt_in", "1", NO_TRACK_COOKIE);
    } else {
      actionCookies.delete("cf_track_opt_in");
      actionCookies.set("cf_no_track", "1", NO_TRACK_COOKIE);
    }
    redirect("/studio/settings");
  }

  return <div className="admin-dashboard admin-operations-page"><p className="admin-eyebrow">Studio controls</p><h1>Settings</h1><p className="admin-muted">Feature flags are off by default and activate deliberately.</p><section className="admin-flag-list"><article className="admin-flag-card"><div><strong>Count my visits on this site</strong><p>{visitsExcluded ? "Off — your visits are excluded from site traffic." : "On — your visits are included in site traffic."}</p></div><form action={setVisitTracking}><input type="hidden" name="countVisits" value={visitsExcluded ? "on" : "off"} /><button className={`admin-flag-toggle ${!visitsExcluded ? "is-on" : ""}`} type="submit">{visitsExcluded ? "Turn on" : "Turn off"}</button></form></article></section><SettingsAdmin initialFlags={flags ?? []} /></div>;
}

function AdminMessage({ message }: { message: string }) { return <div className="admin-dashboard"><p className="admin-eyebrow">Studio controls</p><h1>Settings</h1><p className="admin-muted">{message}</p></div>; }
