import { createClient } from "../../../../lib/supabase/server";
import SchedulingAdmin, { type AdminAppointment, type AdminAvailability, type SchedulingCustomer, type SchedulingInquiry } from "../../../../components/admin-scheduling";
import "../../admin.css";
import "../../operations.css";

export const dynamic = "force-dynamic";

export default async function AdminSchedulingPage() {
  const supabase = await createClient();
  if (!supabase) return <AdminMessage message="Supabase is not configured." />;
  const [{ data: availability, error }, { data: appointments }, { data: customers }, { data: inquiries }] = await Promise.all([
    supabase.from("availability").select("*").order("starts_at"),
    supabase.from("appointments").select("*").order("starts_at"),
    supabase.from("customers").select("id, name, email").order("name"),
    supabase.from("inquiries").select("id, name, email, work_title_snapshot").order("created_at", { ascending: false }),
  ]);
  if (error) return <AdminMessage message="Scheduling could not be loaded." />;
  const customerById = new Map((customers ?? []).map((item) => [item.id, item]));
  const inquiryById = new Map((inquiries ?? []).map((item) => [item.id, item]));
  const adminAppointments: AdminAppointment[] = (appointments ?? []).map((appointment) => ({ ...appointment, customer: appointment.customer_id ? customerById.get(appointment.customer_id) ?? null : null, inquiry: appointment.inquiry_id ? inquiryById.get(appointment.inquiry_id) ?? null : null }));
  return <div className="admin-dashboard admin-operations-page"><p className="admin-eyebrow">Studio calendar</p><h1>Scheduling</h1><p className="admin-muted">Block dates, open booking windows, and track consultations.</p><SchedulingAdmin availability={(availability ?? []) as AdminAvailability[]} appointments={adminAppointments} customers={(customers ?? []) as SchedulingCustomer[]} inquiries={(inquiries ?? []) as SchedulingInquiry[]} /></div>;
}

function AdminMessage({ message }: { message: string }) { return <div className="admin-dashboard"><p className="admin-eyebrow">Studio calendar</p><h1>Scheduling</h1><p className="admin-muted">{message}</p></div>; }
