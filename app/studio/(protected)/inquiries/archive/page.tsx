import Link from "next/link";
import { createClient } from "../../../../../lib/supabase/server";
import InquiryAdmin, { type AdminInquiry } from "../../../../../components/admin-inquiries";
import "../../../admin.css";
import "../../../operations.css";

export const dynamic = "force-dynamic";

export default async function ArchivedInquiriesPage() {
  const supabase = await createClient();
  if (!supabase) return <AdminMessage message="Supabase is not configured." />;
  const [{ data: inquiries, error }, { data: works }] = await Promise.all([
    supabase.from("inquiries").select("*").not("archived_at", "is", null).order("archived_at", { ascending: false }),
    supabase.from("works").select("id, title, slug"),
  ]);
  if (error) return <AdminMessage message="Archived inquiries could not be loaded." />;
  const worksById = new Map((works ?? []).map((work) => [work.id, work]));
  const rows: AdminInquiry[] = (inquiries ?? []).map((inquiry) => ({ ...inquiry, work: inquiry.work_id ? worksById.get(inquiry.work_id) ?? null : null }));
  return <div className="admin-dashboard admin-operations-page"><p className="admin-eyebrow">Studio archive</p><h1>Archived inquiries</h1><p className="admin-muted">Past leads remain here until you restore them to the active inbox.</p><Link className="admin-archive-link" href="/studio/inquiries">← Back to active inquiries</Link><InquiryAdmin archived initialInquiries={rows} /></div>;
}

function AdminMessage({ message }: { message: string }) { return <div className="admin-dashboard"><p className="admin-eyebrow">Studio archive</p><h1>Archived inquiries</h1><p className="admin-muted">{message}</p></div>; }
