import { createClient } from "../../../../lib/supabase/server";
import "../../admin.css";
import "../../operations.css";

export const dynamic = "force-dynamic";

export default async function AdminInsightsPage() {
  const supabase = await createClient();
  if (!supabase) return <AdminMessage message="Supabase is not configured." />;
  const [{ data: orders, error }, { data: works }, { data: series }, { data: customers }] = await Promise.all([
    supabase.from("orders").select("id, customer_id, work_id, amount, currency, sale_date, payment_status"),
    supabase.from("works").select("id, title, year, series_id"),
    supabase.from("series").select("id, name"),
    supabase.from("customers").select("id, name, email"),
  ]);
  if (error) return <AdminMessage message="Insights could not be loaded." />;
  const validOrders = (orders ?? []).filter((order) => order.payment_status === "paid");
  const worksById = new Map((works ?? []).map((work) => [work.id, work]));
  const seriesById = new Map((series ?? []).map((item) => [item.id, item.name]));
  const customerCounts = new Map<string, number>();
  validOrders.forEach((order) => { if (order.customer_id) customerCounts.set(order.customer_id, (customerCounts.get(order.customer_id) ?? 0) + 1); });
  const buyers = customerCounts.size;
  const repeatBuyers = Array.from(customerCounts.values()).filter((count) => count > 1).length;
  const totalRevenue = validOrders.reduce((sum, order) => sum + Number(order.amount ?? 0), 0);
  const averageTicket = validOrders.length ? totalRevenue / validOrders.length : 0;
  const bySeries = aggregate(validOrders, (order) => { const work = order.work_id ? worksById.get(order.work_id) : null; return work?.series_id ? seriesById.get(work.series_id) ?? "Unassigned series" : "Unassigned series"; });
  const byYear = aggregate(validOrders, (order) => { const work = order.work_id ? worksById.get(order.work_id) : null; return String(work?.year ?? (order.sale_date ? new Date(order.sale_date).getFullYear() : "Unknown")); });
  const perCustomer = Array.from(customerCounts.entries()).map(([id, count]) => ({ name: customers?.find((customer) => customer.id === id)?.name || customers?.find((customer) => customer.id === id)?.email || "Unknown", count, average: (validOrders.filter((order) => order.customer_id === id).reduce((sum, order) => sum + Number(order.amount ?? 0), 0) / count) })).sort((a, b) => b.average - a.average);
  return <div className="admin-dashboard admin-operations-page"><p className="admin-eyebrow">Studio intelligence</p><h1>Insights</h1><p className="admin-muted">Read-only performance from paid manual orders.</p><div className="admin-metric-grid"><Metric label="Revenue" value={`PHP ${totalRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`} /><Metric label="Paid orders" value={String(validOrders.length)} /><Metric label="Average ticket" value={`PHP ${averageTicket.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`} /><Metric label="Repeat-buyer rate" value={`${buyers ? Math.round((repeatBuyers / buyers) * 100) : 0}%`} /></div><InsightTable title="Revenue by series" rows={bySeries} /><InsightTable title="Revenue by year" rows={byYear} /><section className="admin-insight-section"><h2>Average ticket by customer</h2>{perCustomer.length ? <div className="admin-insight-table">{perCustomer.map((row) => <div className="admin-insight-row" key={row.name}><span>{row.name}</span><span>{row.count} order{row.count === 1 ? "" : "s"}</span><b>PHP {row.average.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</b></div>)}</div> : <p className="admin-empty-state">No paid orders yet.</p>}</section></div>;
}

function aggregate(orders: Array<{ amount: number | null; work_id: string | null; sale_date: string | null }>, key: (order: { work_id: string | null; sale_date: string | null }) => string) {
  const values = new Map<string, { revenue: number; count: number }>();
  orders.forEach((order) => { const label = key(order); const current = values.get(label) ?? { revenue: 0, count: 0 }; values.set(label, { revenue: current.revenue + Number(order.amount ?? 0), count: current.count + 1 }); });
  return Array.from(values.entries()).map(([label, value]) => ({ label, ...value })).sort((a, b) => b.revenue - a.revenue);
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="admin-metric"><span>{label}</span><strong>{value}</strong></div>; }
function InsightTable({ title, rows }: { title: string; rows: Array<{ label: string; revenue: number; count: number }> }) { return <section className="admin-insight-section"><h2>{title}</h2>{rows.length ? <div className="admin-insight-table">{rows.map((row) => <div className="admin-insight-row" key={row.label}><span>{row.label}</span><span>{row.count} sale{row.count === 1 ? "" : "s"}</span><b>PHP {row.revenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</b></div>)}</div> : <p className="admin-empty-state">No paid orders yet.</p>}</section>; }
function AdminMessage({ message }: { message: string }) { return <div className="admin-dashboard"><p className="admin-eyebrow">Studio intelligence</p><h1>Insights</h1><p className="admin-muted">{message}</p></div>; }
