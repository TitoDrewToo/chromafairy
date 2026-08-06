import { createClient } from "../../../../lib/supabase/server";
import SalesAdmin, { type AdminOrder, type SaleCustomer, type SaleInquiry, type SaleWork } from "../../../../components/admin-sales";
import "../../admin.css";
import "../../operations.css";

export const dynamic = "force-dynamic";

export default async function AdminSalesPage() {
  const supabase = await createClient();
  if (!supabase) return <AdminMessage message="Supabase is not configured." />;
  const [{ data: works }, { data: customers }, { data: inquiries }, { data: orders, error }] = await Promise.all([
    supabase.from("works").select("id, title, slug, status, price_php, price_usd").order("title"),
    supabase.from("customers").select("*").order("name"),
    supabase.from("inquiries").select("id, name, email, work_id, work_title_snapshot").order("created_at", { ascending: false }),
    supabase.from("orders").select("*").order("sale_date", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  if (error) return <AdminMessage message="Sales could not be loaded." />;
  const worksById = new Map((works ?? []).map((work) => [work.id, work]));
  const customersById = new Map((customers ?? []).map((customer) => [customer.id, customer]));
  const rows: AdminOrder[] = (orders ?? []).map((order) => ({ ...order, work: order.work_id ? worksById.get(order.work_id) ?? null : null, customer: order.customer_id ? customersById.get(order.customer_id) ?? null : null }));
  return <div className="admin-dashboard admin-operations-page"><p className="admin-eyebrow">Studio operations</p><h1>Sales</h1><p className="admin-muted">Record manual sales and keep fulfilment details together.</p><SalesAdmin works={(works ?? []) as SaleWork[]} customers={(customers ?? []) as SaleCustomer[]} inquiries={(inquiries ?? []) as SaleInquiry[]} initialOrders={rows} /></div>;
}

function AdminMessage({ message }: { message: string }) { return <div className="admin-dashboard"><p className="admin-eyebrow">Studio operations</p><h1>Sales</h1><p className="admin-muted">{message}</p></div>; }
