import { createClient } from "../../../../lib/supabase/server";
import InquiryAdmin, { type AdminInquiry } from "../../../../components/admin-inquiries";
import "../../admin.css";
import "../../operations.css";

export const dynamic = "force-dynamic";

export default async function AdminInquiriesPage() {
  const supabase = await createClient();
  if (!supabase) return <AdminMessage message="Supabase is not configured." />;
  const [{ data: inquiries, error }, { data: works }] = await Promise.all([
    supabase.from("inquiries").select("*").is("archived_at", null).order("created_at", { ascending: false }),
    supabase.from("works").select("id, title, slug"),
  ]);
  if (error) return <AdminMessage message="Inquiries could not be loaded." />;
  const worksById = new Map((works ?? []).map((work) => [work.id, work]));
  const rows: AdminInquiry[] = (inquiries ?? []).map((inquiry) => ({ ...inquiry, work: inquiry.work_id ? worksById.get(inquiry.work_id) ?? null : null }));
  return <div className="admin-dashboard admin-operations-page"><p className="admin-eyebrow">Studio inbox</p><h1>Inquiries</h1><p className="admin-muted">Piece and commission leads from the public site.</p><InquiryAdmin initialInquiries={rows} /></div>;
}

function AdminMessage({ message }: { message: string }) { return <div className="admin-dashboard"><p className="admin-eyebrow">Studio inbox</p><h1>Inquiries</h1><p className="admin-muted">{message}</p></div>; }
