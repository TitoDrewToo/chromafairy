"use client";

import { useState } from "react";
import { updateFeatureFlag } from "../app/actions/admin-settings";
import type { FeatureFlag } from "../lib/supabase/types";

export default function SettingsAdmin({ initialFlags }: { initialFlags: FeatureFlag[] }) {
  const [flags, setFlags] = useState(initialFlags);
  const [error, setError] = useState("");

  async function toggle(flag: FeatureFlag) {
    const result = await updateFeatureFlag(flag.key, !flag.enabled);
    if (!result.ok) setError(result.error ?? "Could not update that flag.");
    else setFlags((current) => current.map((item) => item.key === flag.key ? { ...item, enabled: !item.enabled } : item));
  }

  return <section className="admin-flag-list">{error && <p className="admin-error" role="alert">{error}</p>}{flags.map((flag) => <article className="admin-flag-card" key={flag.key}><div><strong>{flag.key}</strong><p>{flag.notes}</p></div><button aria-pressed={flag.enabled} className={`admin-flag-toggle ${flag.enabled ? "is-on" : ""}`} onClick={() => void toggle(flag)} type="button">{flag.enabled ? "On" : "Off"}</button></article>)}</section>;
}
