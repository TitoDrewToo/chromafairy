"use client";

import Link from "next/link";
import { useState } from "react";
import type { Inquiry, InquiryStatus } from "../lib/supabase/types";
import { createClient } from "../lib/supabase/client";

export type AdminInquiry = Inquiry & { work: { id: string; title: string; slug: string } | null };
const statuses: InquiryStatus[] = ["new", "replied", "closed"];

export default function InquiryAdmin({ initialInquiries }: { initialInquiries: AdminInquiry[] }) {
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [error, setError] = useState("");
  async function advance(inquiry: AdminInquiry) {
    const next = statuses[Math.min(statuses.indexOf(inquiry.status) + 1, statuses.length - 1)];
    if (next === inquiry.status) return;
    const supabase = createClient();
    if (!supabase) return setError("Supabase is not configured.");
    const { error: updateError } = await supabase.from("inquiries").update({ status: next }).eq("id", inquiry.id);
    if (updateError) return setError("Could not update inquiry status.");
    setInquiries((current) => current.map((item) => item.id === inquiry.id ? { ...item, status: next } : item));
  }
  return <section className="admin-operation-list">
    {error && <p className="admin-error" role="alert">{error}</p>}
    {inquiries.length ? inquiries.map((inquiry) => <article className="admin-inquiry-card" key={inquiry.id}>
      <div className="admin-inquiry-top"><span className="admin-type-badge">{inquiry.type}</span><span className="admin-operation-date">{formatDate(inquiry.created_at)}</span></div>
      <h2>{inquiry.name} <span>· {inquiry.email}</span></h2>
      {inquiry.phone && <p className="admin-muted">{inquiry.phone}</p>}
      {inquiry.message && <p className="admin-inquiry-message">{inquiry.message}</p>}
      <div className="admin-inquiry-meta">{inquiry.work ? <Link href={`/shop/${inquiry.work.slug}`}>Work: {inquiry.work.title}</Link> : <span>General commission</span>}<span>Source: {inquiry.source ?? "—"}</span></div>
      <div className="admin-card-actions"><span className={`admin-status-badge status-${inquiry.status}`}>{inquiry.status}</span><a className="admin-small-button" href={`mailto:${encodeURIComponent(inquiry.email)}?subject=${encodeURIComponent(inquiry.work ? `Re: ${inquiry.work.title}` : "Re: your Chroma Fairy inquiry")}`}>Reply by email</a><button className="admin-action-button" disabled={inquiry.status === "closed"} onClick={() => void advance(inquiry)} type="button"><span className="admin-action-label">{inquiry.status === "new" ? "Mark replied" : inquiry.status === "replied" ? "Close inquiry" : "Closed"}</span></button></div>
    </article>) : <div className="admin-empty-state">No inquiries yet.</div>}
  </section>;
}

function formatDate(value: string | null) { return value ? new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"; }
