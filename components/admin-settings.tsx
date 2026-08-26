"use client";

import { useState } from "react";
import { updateFeatureFlag } from "../app/actions/admin-settings";
import type { FeatureFlag } from "../lib/supabase/types";
import { Hint } from "./studio-hint";

const FLAG_GROUPS = [
  { label: "Scheduling", flags: [["calendar_sync", "Calendar sync"], ["self_booking", "Self-booking"]] },
  { label: "Sales", flags: [["payments", "Payments"], ["shipping_automation", "Shipping automation"]] },
] as const;

export default function SettingsAdmin({ initialFlags }: { initialFlags: FeatureFlag[] }) {
  const [flags, setFlags] = useState(initialFlags);
  const [error, setError] = useState("");

  async function toggle(flag: FeatureFlag) {
    const result = await updateFeatureFlag(flag.key, !flag.enabled);
    if (!result.ok) setError(result.error ?? "Could not update that flag.");
    else setFlags((current) => current.map((item) => item.key === flag.key ? { ...item, enabled: !item.enabled } : item));
  }

  return <section className="admin-flag-list">{error && <p className="admin-error" role="alert">{error}</p>}{FLAG_GROUPS.map((group) => <section className="admin-flag-group" key={group.label}><Hint id="settingsGroup"><h2 className="admin-flag-group-label">{group.label}</h2></Hint>{group.flags.map(([key, label]) => { const flag = flags.find((item) => item.key === key); if (!flag) return null; const hintId = flag.key === "payments" ? "payments" : flag.key === "shipping_automation" ? "shippingAutomation" : flag.key === "self_booking" ? "selfBooking" : "calendarSync"; return <article className="admin-flag-card" key={flag.key}><div><strong>{label}</strong><p>{flag.notes}</p></div><Hint id={hintId}><button aria-pressed={flag.enabled} className={`admin-flag-toggle ${flag.enabled ? "is-on" : ""}`} onClick={() => void toggle(flag)} type="button">{flag.enabled ? "On" : "Off"}</button></Hint></article>; })}</section>)}</section>;
}
