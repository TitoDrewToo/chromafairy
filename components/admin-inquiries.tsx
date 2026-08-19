"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Inquiry, InquiryStatus } from "../lib/supabase/types";
import { createClient } from "../lib/supabase/client";
import { Hint } from "./studio-hint";

export type AdminInquiry = Inquiry & { work: { id: string; title: string; slug: string } | null };
const statuses: InquiryStatus[] = ["new", "replied", "closed"];

function gmailComposeUrl(inquiry: AdminInquiry) {
  const subject = inquiry.work ? `Re: ${inquiry.work.title} — Chroma Fairy` : "Re: your Chroma Fairy inquiry";
  const firstName = (inquiry.name ?? "").trim().split(/\s+/)[0] || "there";
  const body = inquiry.work
    ? `Hi ${firstName},\n\nThank you so much for reaching out about “${inquiry.work.title}” — it means a lot that it caught your eye. I'd love to share more about the piece — its size, story, and price — and help however suits you best, whether that's seeing it in person or arranging delivery.\n\nIs there anything in particular you'd like to know?\n\nWarmly,`
    : `Hi ${firstName},\n\nThank you so much for reaching out about a commission — I'd be delighted to create something just for you. To picture the right piece, it helps to know a few things: the space it's for, the colors and mood you're drawn to, a rough size, and any timeline or budget in mind.\n\nShare whatever comes to mind and we'll shape it together from there.\n\nWarmly,`;
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(inquiry.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function InquiryAdmin({ initialInquiries }: { initialInquiries: AdminInquiry[] }) {
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [error, setError] = useState("");
  const newCount = useMemo(() => inquiries.filter((item) => item.status === "new").length, [inquiries]);

  async function setStatus(inquiry: AdminInquiry, next: InquiryStatus) {
    if (next === inquiry.status) return;
    const supabase = createClient();
    if (!supabase) return setError("Supabase is not configured.");
    const { error: updateError } = await supabase.from("inquiries").update({ status: next }).eq("id", inquiry.id);
    if (updateError) return setError("Could not update inquiry status.");
    setInquiries((current) => current.map((item) => item.id === inquiry.id ? { ...item, status: next } : item));
  }

  const nextStatus = (inquiry: AdminInquiry) => statuses[Math.min(statuses.indexOf(inquiry.status) + 1, statuses.length - 1)];

  return <section className="admin-operation-list">
    {error && <p className="admin-error" role="alert">{error}</p>}
    {newCount > 0 && <p className="admin-muted admin-inquiry-count">{newCount} new {newCount === 1 ? "inquiry" : "inquiries"} to reply to.</p>}
    {inquiries.length ? inquiries.map((inquiry) => <article className={`admin-inquiry-card${inquiry.status === "new" ? " admin-inquiry-new" : ""}`} key={inquiry.id}>
      <div className="admin-inquiry-top"><span className="admin-type-badge">{inquiry.type}</span><span className="admin-operation-date">{formatDate(inquiry.created_at)}</span></div>
      <h2>{inquiry.name} <span>· {inquiry.email}</span></h2>
      {inquiry.phone && <p className="admin-muted">{inquiry.phone}</p>}
      {inquiry.message && <p className="admin-inquiry-message">{inquiry.message}</p>}
      <div className="admin-inquiry-meta">{inquiry.work ? <Hint id="viewWork"><Link href={`/shop/${inquiry.work.slug}`}>Work: {inquiry.work.title}</Link></Hint> : <span>General commission</span>}<span>Source: {inquiry.source ?? "—"}</span></div>
      <div className="admin-card-actions">
        <span className={`admin-status-badge status-${inquiry.status}`}>{inquiry.status}</span>
        <Hint id="replyEmail"><a className="admin-small-button" href={gmailComposeUrl(inquiry)} target="_blank" rel="noopener noreferrer" onClick={() => { if (inquiry.status === "new") void setStatus(inquiry, "replied"); }}>Reply in Gmail</a></Hint>
        <Hint id="closeInquiry"><button className="admin-action-button" disabled={inquiry.status === "closed"} onClick={() => void setStatus(inquiry, nextStatus(inquiry))} type="button"><span className="admin-action-label">{inquiry.status === "new" ? "Mark replied" : inquiry.status === "replied" ? "Close inquiry" : "Closed"}</span></button></Hint>
      </div>
    </article>) : <div className="admin-empty-state">No inquiries yet.</div>}
  </section>;
}

function formatDate(value: string | null) { return value ? new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"; }
