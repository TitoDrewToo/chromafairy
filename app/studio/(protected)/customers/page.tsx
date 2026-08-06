import { createClient } from "../../../../lib/supabase/server";
import CustomersAdmin, { type AdminCustomer } from "../../../../components/admin-customers";
import "../../admin.css";
import "../../operations.css";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const supabase = await createClient();
  if (!supabase) return <AdminMessage message="Supabase is not configured." />;
  const [{ data: customers, error }, { data: orders }, { data: works }] = await Promise.all([
    supabase.from("customers").select("*").order("name"),
    supabase.from("orders").select("id, customer_id, work_id, amount, currency, sale_date, order_status").order("sale_date", { ascending: false }),
    supabase.from("works").select("id, title, slug"),
  ]);
  if (error) return <AdminMessage message="Customers could not be loaded." />;
  const worksById = new Map((works ?? []).map((work) => [work.id, work]));
  const rows: AdminCustomer[] = (customers ?? []).map((customer) => ({ ...customer, orders: (orders ?? []).filter((order) => order.customer_id === customer.id).map((order) => ({ ...order, work: order.work_id ? worksById.get(order.work_id) ?? null : null })) }));
  return <div className="admin-dashboard admin-operations-page"><p className="admin-eyebrow">Studio relationships</p><h1>Customers</h1><p className="admin-muted">Contacts and their purchase history.</p><CustomersAdmin initialCustomers={rows} /></div>;
}

function AdminMessage({ message }: { message: string }) { return <div className="admin-dashboard"><p className="admin-eyebrow">Studio relationships</p><h1>Customers</h1><p className="admin-muted">{message}</p></div>; }
