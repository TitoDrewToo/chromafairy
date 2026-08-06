"use client";

import Link from "next/link";
import { useState } from "react";
import { recordSale, updateOrderStatus } from "../app/actions/admin-sales";
import type { Customer, Inquiry, Order, OrderStatus, PackageType, Work } from "../lib/supabase/types";

export type SaleWork = Pick<Work, "id" | "title" | "slug" | "status" | "price_php" | "price_usd">;
export type SaleCustomer = Customer;
export type SaleInquiry = Pick<Inquiry, "id" | "name" | "email" | "work_id" | "work_title_snapshot">;
export type AdminOrder = Order & { work: SaleWork | null; customer: SaleCustomer | null };
const orderStatuses: OrderStatus[] = ["paid", "packed", "shipped", "delivered", "cancelled"];

export default function SalesAdmin({ works, customers: initialCustomers, inquiries, initialOrders }: { works: SaleWork[]; customers: SaleCustomer[]; inquiries: SaleInquiry[]; initialOrders: AdminOrder[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [customers, setCustomers] = useState(initialCustomers);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [workId, setWorkId] = useState("");
  const [inquiryId, setInquiryId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("PHP");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [channel, setChannel] = useState("studio");
  const [notes, setNotes] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [packageType, setPackageType] = useState<PackageType>("flat");
  const [showShipment, setShowShipment] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function chooseCustomer(id: string) {
    setCustomerId(id); const customer = customers.find((item) => item.id === id); if (customer) { setCustomerName(customer.name ?? ""); setCustomerEmail(customer.email ?? ""); setCustomerPhone(customer.phone ?? ""); }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    if (!customerName.trim() || !customerEmail.trim() || !workId || !amount || Number(amount) < 0) return setError("Customer name, email, work, and a valid amount are required.");
    setBusy(true);
    try {
      const result = await recordSale({ customerId: customerId || undefined, customerName: customerName.trim(), customerEmail: customerEmail.trim(), customerPhone: customerPhone.trim(), workId, inquiryId: inquiryId || undefined, amount: Number(amount), currency, saleDate, channel, notes, shipment: showShipment ? { carrier, trackingNumber, packageType } : undefined });
      const customer = customers.find((item) => item.id === result.customerId) ?? { id: result.customerId, name: customerName, email: customerEmail, phone: customerPhone, notes: null, created_at: null, updated_at: null };
      const work = works.find((item) => item.id === workId) ?? null;
      setCustomers((current) => current.some((item) => item.id === customer.id) ? current.map((item) => item.id === customer.id ? customer : item) : [...current, customer]);
      setOrders((current) => [{ id: result.orderId, work_id: workId, inquiry_id: inquiryId || null, customer_id: result.customerId, buyer_name: customerName, buyer_email: customerEmail, buyer_phone: customerPhone || null, amount: Number(amount), currency, payment_status: "paid", payment_provider: "manual", payment_ref: null, order_status: "paid", work_status_before_sale: null, sale_date: saleDate, channel, notes: notes || null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), work, customer }, ...current]);
      setMessage("Sale recorded and work marked sold."); setCustomerId(""); setCustomerName(""); setCustomerEmail(""); setCustomerPhone(""); setWorkId(""); setInquiryId(""); setAmount(""); setNotes(""); setCarrier(""); setTrackingNumber("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not record sale."); }
    setBusy(false);
  }
  async function updateOrder(id: string, orderStatus: OrderStatus) {
    const result = await updateOrderStatus(id, orderStatus);
    if (!result.ok) setError(result.error ?? "Could not update order status."); else setOrders((current) => current.map((order) => order.id === id ? { ...order, order_status: orderStatus } : order));
  }
  return <section className="admin-sales-layout">
    <form className="admin-operation-form" onSubmit={submit}><h2>Record a sale</h2>
      <label>Existing customer<select value={customerId} onChange={(event) => chooseCustomer(event.target.value)}><option value="">New or match by email</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name || customer.email}</option>)}</select></label>
      <div className="admin-two-col"><label>Name<input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></label><label>Email<input required type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} /></label></div>
      <label>Phone<input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} /></label>
      <label>Work<select required value={workId} onChange={(event) => setWorkId(event.target.value)}><option value="">Choose work</option>{works.filter((work) => work.status !== "draft").map((work) => <option key={work.id} value={work.id}>{work.title} · {work.status}</option>)}</select></label>
      <div className="admin-two-col"><label>Final amount<input required min="0" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Currency<select value={currency} onChange={(event) => setCurrency(event.target.value)}><option>PHP</option><option>USD</option><option>EUR</option></select></label></div>
      <div className="admin-two-col"><label>Sale date<input required type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} /></label><label>Channel<input value={channel} onChange={(event) => setChannel(event.target.value)} /></label></div>
      <label>Originating inquiry<select value={inquiryId} onChange={(event) => setInquiryId(event.target.value)}><option value="">None</option>{inquiries.map((inquiry) => <option key={inquiry.id} value={inquiry.id}>{inquiry.name} · {inquiry.work_title_snapshot ?? "Commission"}</option>)}</select></label>
      <label>Notes<textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      <label className="admin-check"><input checked={showShipment} onChange={(event) => setShowShipment(event.target.checked)} type="checkbox" /> Add manual shipment</label>
      {showShipment && <div className="admin-two-col"><label>Carrier<input value={carrier} onChange={(event) => setCarrier(event.target.value)} /></label><label>Tracking<input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} /></label><label>Package<select value={packageType} onChange={(event) => setPackageType(event.target.value as PackageType)}><option value="flat">Flat</option><option value="rolled_tube">Rolled tube</option><option value="crate">Crate</option></select></label></div>}
      {error && <p className="admin-error" role="alert">{error}</p>}{message && <p className="admin-inline-success" role="status">{message}</p>}<button className="admin-action-button" disabled={busy} type="submit"><span className="admin-action-label">{busy ? "Recording…" : "Record sale"}</span></button>
    </form>
    <div className="admin-order-list"><h2>Orders</h2>{orders.length ? orders.map((order) => <article className="admin-order-card" key={order.id}><div><strong>{order.work?.title ?? "Work removed"}</strong><span>{order.customer?.name ?? order.buyer_name ?? order.buyer_email} · {order.sale_date}</span></div><b>{formatAmount(order.amount, order.currency)}</b><select aria-label={`Order status for ${order.id}`} value={order.order_status ?? "paid"} onChange={(event) => void updateOrder(order.id, event.target.value as OrderStatus)}>{orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>{order.work && <Link href={`/shop/${order.work.slug}`}>View work</Link>}</article>) : <p className="admin-empty-state">No sales recorded yet.</p>}</div>
  </section>;
}

function formatAmount(amount: number | null, currency: string | null) { return `${currency ?? "PHP"} ${Number(amount ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`; }
