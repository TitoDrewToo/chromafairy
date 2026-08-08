"use client";

import { useMemo, useState } from "react";
import { updateErrorGroupStatus, updateErrorReview } from "../app/actions/admin-systems";
import { createClient } from "../lib/supabase/client";
import type { ErrorEvent, ErrorGroup, ReviewVerdict } from "../lib/supabase/types";

export default function SystemsAdmin({ initialGroups }: { initialGroups: ErrorGroup[] }) {
  const [groups, setGroups] = useState(initialGroups);
  const [selected, setSelected] = useState<ErrorGroup | null>(null);
  const [events, setEvents] = useState<ErrorEvent[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");

  const filtered = useMemo(() => groups.filter((group) => (status === "all" || group.status === status) && `${group.title} ${group.fingerprint}`.toLowerCase().includes(query.toLowerCase())), [groups, query, status]);

  async function openGroup(group: ErrorGroup) {
    setSelected(group); setError("");
    const client = createClient();
    if (!client) return setError("Supabase is not configured.");
    const result = await client.from("error_events").select("*").eq("fingerprint", group.fingerprint).order("occurred_at", { ascending: false }).limit(50);
    if (result.error) setError("Could not load occurrences."); else setEvents((result.data ?? []) as ErrorEvent[]);
  }

  async function changeStatus(group: ErrorGroup, next: string) {
    const result = await updateErrorGroupStatus(group.fingerprint, next);
    if (!result.ok) return setError(result.error ?? "Could not update status.");
    setGroups((current) => current.map((item) => item.fingerprint === group.fingerprint ? { ...item, status: next } : item));
    if (selected?.fingerprint === group.fingerprint) setSelected({ ...group, status: next });
  }

  async function review(group: ErrorGroup, verdict: ReviewVerdict | null) {
    const result = await updateErrorReview(group.fingerprint, verdict);
    if (!result.ok) return setError(result.error ?? "Could not save review.");
    setGroups((current) => current.map((item) => item.fingerprint === group.fingerprint ? { ...item, review_verdict: verdict } : item));
    if (selected?.fingerprint === group.fingerprint) setSelected({ ...group, review_verdict: verdict });
  }

  return <section className="systems-admin"><div className="systems-toolbar"><label>Search<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Message or fingerprint" /></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="new">New</option><option value="triaged">Triaged</option><option value="resolved">Resolved</option></select></label></div>{error && <p className="admin-error" role="alert">{error}</p>}<div className="systems-columns"><div className="systems-group-list">{filtered.length ? filtered.map((group) => <button className={`systems-group-row ${selected?.fingerprint === group.fingerprint ? "is-selected" : ""}`} key={group.fingerprint} onClick={() => void openGroup(group)} type="button"><span><strong>{group.title}</strong><small>{group.fingerprint}</small></span><span>{group.count}<small>{group.status}</small></span></button>) : <p className="admin-empty-state">No captured errors match these filters.</p>}</div>{selected && <article className="systems-detail"><div className="systems-detail-heading"><div><p className="admin-eyebrow">Issue</p><h2>{selected.title}</h2></div><select aria-label="Issue status" value={selected.status} onChange={(event) => void changeStatus(selected, event.target.value)}><option value="new">New</option><option value="triaged">Triaged</option><option value="resolved">Resolved</option></select></div><dl className="systems-meta"><div><dt>Where</dt><dd>{events[0]?.tool ?? "—"} · {events[0]?.fn ?? "—"} · {events[0]?.action ?? "—"}</dd></div><div><dt>Count</dt><dd>{selected.count}</dd></div><div><dt>First / last seen</dt><dd>{formatDate(selected.first_seen)} / {formatDate(selected.last_seen)}</dd></div></dl><div className="systems-review"><span>Review verdict</span>{(["matched", "partial", "wrong"] as ReviewVerdict[]).map((verdict) => <button className={selected.review_verdict === verdict ? "is-active" : ""} key={verdict} onClick={() => void review(selected, verdict)} type="button">{verdict}</button>)}</div><h3>Occurrences</h3><div className="systems-events">{events.map((event) => <details key={event.id}><summary>{formatDate(event.occurred_at)} · {event.message}</summary><pre>{event.stack || "No stack recorded."}</pre></details>)}</div></article>}</div></section>;
}

function formatDate(value: string | null) { return value ? `${new Date(value).toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })} UTC · ${new Date(value).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })} Manila` : "—"; }
