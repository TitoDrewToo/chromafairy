"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Inquiry, InquiryStatus } from "../lib/supabase/types";
import { createClient } from "../lib/supabase/client";
import { Hint } from "./studio-hint";

export type AdminInquiry = Inquiry & { work: { id: string; title: string; slug: string } | null };
const statuses: InquiryStatus[] = ["new", "replied", "closed"];
type ArchiveFilter = "active" | "archived" | "all";
type TypeFilter = "all" | Inquiry["type"];

function gmailComposeUrl(inquiry: AdminInquiry) {
  const subject = inquiry.work ? `Re: ${inquiry.work.title} — Chroma Fairy` : "Re: your Chroma Fairy inquiry";
  const firstName = (inquiry.name ?? "").trim().split(/\s+/)[0] || "there";
  const body = inquiry.work
    ? `Hi ${firstName},\n\nThank you so much for reaching out about “${inquiry.work.title}” — it means a lot that it caught your eye. I'd love to share more about the piece — its size, story, and price — and help however suits you best, whether that's seeing it in person or arranging delivery.\n\nIs there anything in particular you'd like to know?\n\nWarmly,`
    : `Hi ${firstName},\n\nThank you so much for reaching out about a commission — I'd be delighted to create something just for you. To picture the right piece, it helps to know a few things: the space it's for, the colors and mood you're drawn to, a rough size, and any timeline or budget in mind.\n\nShare whatever comes to mind and we'll shape it together from there.\n\nWarmly,`;
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(inquiry.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function InquiryAdmin({ initialInquiries, archived = false }: { initialInquiries: AdminInquiry[]; archived?: boolean }) {
  const router = useRouter();
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [selectedInquiry, setSelectedInquiry] = useState<AdminInquiry | null>(null);
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>(archived ? "archived" : "active");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [sortNewest, setSortNewest] = useState(true);
  const [error, setError] = useState("");

  const newCount = useMemo(() => inquiries.filter((item) => item.status === "new" && !item.archived_at).length, [inquiries]);
  const visibleInquiries = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return inquiries
      .filter((item) => archiveFilter === "all" || (archiveFilter === "archived" ? Boolean(item.archived_at) : !item.archived_at))
      .filter((item) => typeFilter === "all" || item.type === typeFilter)
      .filter((item) => statusFilter === "all" || item.status === statusFilter)
      .filter((item) => !query || [item.name, item.email, item.message, item.work?.title, item.work_title_snapshot].some((value) => value?.toLocaleLowerCase().includes(query)))
      .sort((a, b) => {
        const difference = new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
        return sortNewest ? -difference : difference;
      });
  }, [archiveFilter, inquiries, search, sortNewest, statusFilter, typeFilter]);

  const hasFilters = archiveFilter !== "active" || typeFilter !== "all" || statusFilter !== "all" || search.trim() !== "" || !sortNewest;

  async function setStatus(inquiry: AdminInquiry, next: InquiryStatus) {
    if (next === inquiry.status) return;
    const supabase = createClient();
    if (!supabase) return setError("Supabase is not configured.");
    const { error: updateError } = await supabase.from("inquiries").update({ status: next }).eq("id", inquiry.id);
    if (updateError) return setError("Could not update inquiry status.");
    setInquiries((current) => current.map((item) => item.id === inquiry.id ? { ...item, status: next } : item));
    setSelectedInquiry((current) => current?.id === inquiry.id ? { ...current, status: next } : current);
    router.refresh();
  }

  async function setArchived(inquiry: AdminInquiry, nextArchived: boolean) {
    const supabase = createClient();
    if (!supabase) return setError("Supabase is not configured.");
    const { error: archiveError } = await supabase.from("inquiries").update({ archived_at: nextArchived ? new Date().toISOString() : null }).eq("id", inquiry.id);
    if (archiveError) return setError(nextArchived ? "Could not archive inquiry." : "Could not restore inquiry.");
    const archivedAt = nextArchived ? new Date().toISOString() : null;
    setInquiries((current) => current.map((item) => item.id === inquiry.id ? { ...item, archived_at: archivedAt } : item));
    setSelectedInquiry((current) => current?.id === inquiry.id ? { ...current, archived_at: archivedAt } : current);
    router.refresh();
  }

  function clearFilters() {
    setArchiveFilter(archived ? "archived" : "active"); setTypeFilter("all"); setStatusFilter("all"); setSearch(""); setSortNewest(true);
  }

  const nextStatus = (inquiry: AdminInquiry) => statuses[Math.min(statuses.indexOf(inquiry.status) + 1, statuses.length - 1)];
  const openButton = (inquiry: AdminInquiry) => <button className="admin-small-button" type="button" onClick={(event) => { event.stopPropagation(); setSelectedInquiry(inquiry); }}>Open</button>;

  return <section className="admin-inquiry-workspace">
    {error && <p className="admin-error" role="alert">{error}</p>}
    {newCount > 0 && <p className="admin-muted admin-inquiry-count">{newCount} new {newCount === 1 ? "inquiry" : "inquiries"} to reply to.</p>}
    <div className="admin-inquiry-toolbar">
      <label className="admin-inquiry-search">Search inquiries<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email, message or work" /></label>
      <div className="admin-inquiry-filters" aria-label="Inquiry filters">
        <label>View<select value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value as ArchiveFilter)}><option value="active">Active</option><option value="archived">Archived</option><option value="all">All</option></select></label>
        <label>Type<select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}><option value="all">All types</option><option value="piece">Piece</option><option value="commission">Commission</option></select></label>
        <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as InquiryStatus | "all")}><option value="all">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <button className="admin-action-button admin-inquiry-sort" type="button" onClick={() => setSortNewest((current) => !current)}>Date: {sortNewest ? "newest first" : "oldest first"}</button>
        {hasFilters && <button className="admin-small-button" type="button" onClick={clearFilters}>Clear all</button>}
      </div>
    </div>
    <p className="admin-inquiry-results">{visibleInquiries.length} {visibleInquiries.length === 1 ? "inquiry" : "inquiries"} shown <span>· {inquiries.length} loaded</span></p>
    {inquiries.length === 0 ? <div className="admin-empty-state">There are no inquiries yet.</div> : visibleInquiries.length === 0 ? <div className="admin-empty-state">No inquiries match the current filters.</div> : <>
      <div className="admin-inquiry-table-wrap"><table className="admin-inquiry-table"><thead><tr><th>Date</th><th>Name</th><th>Type</th><th>Work</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>
        {visibleInquiries.map((inquiry) => <tr className={`admin-inquiry-row${inquiry.archived_at ? " is-archived" : ""}`} key={inquiry.id} onClick={() => setSelectedInquiry(inquiry)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedInquiry(inquiry); } }} role="button" tabIndex={0}>
          <td>{formatDate(inquiry.created_at)}</td><td><strong>{inquiry.name}</strong><span className="admin-inquiry-email">{inquiry.email}</span><span className="admin-inquiry-preview">{inquiry.message || "No message"}</span></td><td><span className="admin-type-badge">{inquiry.type}</span></td><td>{inquiry.work ? <Hint id="viewWork"><Link href={`/shop/${inquiry.work.slug}`} onClick={(event) => event.stopPropagation()}>{inquiry.work.title}</Link></Hint> : inquiry.work_title_snapshot || "General commission"}</td><td><span className={`admin-status-badge status-${inquiry.status}`}>{inquiry.status}</span>{inquiry.archived_at && <span className="admin-inquiry-archived-label">Archived</span>}</td><td>{openButton(inquiry)}</td>
        </tr>)}
      </tbody></table></div>
      <div className="admin-inquiry-mobile-list">{visibleInquiries.map((inquiry) => <article className={`admin-inquiry-mobile-card${inquiry.archived_at ? " is-archived" : ""}`} key={inquiry.id}><button className="admin-inquiry-mobile-open" type="button" onClick={() => setSelectedInquiry(inquiry)}><span>{formatDate(inquiry.created_at)}</span><strong>{inquiry.name}</strong><small>{inquiry.email}</small><span className="admin-inquiry-preview">{inquiry.message || "No message"}</span><span>{inquiry.work?.title || inquiry.work_title_snapshot || "General commission"}</span><span className="admin-inquiry-mobile-status"><span className={`admin-status-badge status-${inquiry.status}`}>{inquiry.status}</span>{inquiry.archived_at && <em>Archived</em>}</span></button>{openButton(inquiry)}</article>)}</div>
    </>}
    {selectedInquiry && <aside className="admin-inquiry-detail" aria-label="Inquiry details"><div className="admin-inquiry-detail-head"><div><p className="admin-eyebrow">Full inquiry</p><h2>{selectedInquiry.name}</h2><p className="admin-muted">{selectedInquiry.email} · {formatDateTime(selectedInquiry.created_at)}</p></div><button className="admin-small-button" type="button" onClick={() => setSelectedInquiry(null)}>Close</button></div><dl className="admin-inquiry-detail-grid"><div><dt>Type</dt><dd>{selectedInquiry.type}</dd></div><div><dt>Work</dt><dd>{selectedInquiry.work ? <Link href={`/shop/${selectedInquiry.work.slug}`}>{selectedInquiry.work.title}</Link> : selectedInquiry.work_title_snapshot || "General commission"}</dd></div><div><dt>Status</dt><dd>{selectedInquiry.status}</dd></div>{selectedInquiry.phone && <div><dt>Phone</dt><dd>{selectedInquiry.phone}</dd></div>}</dl><div className="admin-inquiry-detail-message">{selectedInquiry.message || "No message provided."}</div><div className="admin-card-actions"><Hint id="replyEmail"><a className="admin-small-button" href={gmailComposeUrl(selectedInquiry)} target="_blank" rel="noopener noreferrer" onClick={() => { if (selectedInquiry.status === "new") void setStatus(selectedInquiry, "replied"); }}>Reply in Gmail</a></Hint><Hint id="closeInquiry"><button className="admin-action-button" type="button" disabled={selectedInquiry.status === "closed"} onClick={() => void setStatus(selectedInquiry, nextStatus(selectedInquiry))}>{selectedInquiry.status === "new" ? "Mark replied" : selectedInquiry.status === "replied" ? "Close inquiry" : "Closed"}</button></Hint><Hint id={selectedInquiry.archived_at ? "restoreInquiry" : "archiveInquiry"}><button className="admin-small-button admin-danger-button" type="button" onClick={() => void setArchived(selectedInquiry, !selectedInquiry.archived_at)}>{selectedInquiry.archived_at ? "Restore" : "Archive"}</button></Hint></div></aside>}
  </section>;
}

function formatDate(value: string | null) { return value ? new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"; }
function formatDateTime(value: string | null) { return value ? new Date(value).toLocaleString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"; }
