"use client";

import { useState } from "react";
import type { Customer, Order } from "../lib/supabase/types";
import { createClient } from "../lib/supabase/client";
import { Hint } from "./studio-hint";

type CustomerOrder = Pick<Order, "id" | "work_id" | "amount" | "currency" | "sale_date" | "order_status"> & { work: { id: string; title: string; slug: string } | null };
export type AdminCustomer = Customer & { orders: CustomerOrder[] };

export default function CustomersAdmin({ initialCustomers }: { initialCustomers: AdminCustomer[] }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [phone, setPhone] = useState(""); const [notes, setNotes] = useState("");
  const [error, setError] = useState(""); const [message, setMessage] = useState("");
  function start(customer?: AdminCustomer) { setEditing(customer?.id ?? "new"); setName(customer?.name ?? ""); setEmail(customer?.email ?? ""); setPhone(customer?.phone ?? ""); setNotes(customer?.notes ?? ""); setError(""); setMessage(""); }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!name.trim() || !email.trim()) return setError("Name and email are required."); const supabase = createClient(); if (!supabase) return setError("Supabase is not configured.");
    const id = editing === "new" ? crypto.randomUUID() : editing as string; const payload = { id, name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || null, notes: notes.trim() || null };
    const result = editing === "new" ? await supabase.from("customers").insert(payload) : await supabase.from("customers").update(payload).eq("id", id);
    if (result.error) return setError(result.error.code === "23505" ? "That email is already assigned to a customer." : "Could not save customer.");
    const next: AdminCustomer = { ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), orders: editing === "new" ? [] : customers.find((customer) => customer.id === id)?.orders ?? [] };
    setCustomers((current) => editing === "new" ? [...current, next] : current.map((customer) => customer.id === id ? next : customer)); setEditing(null); setMessage("Customer saved.");
  }
  return <section className="admin-customer-section"><Hint id="addCustomer"><button className="admin-action-button" onClick={() => start()} type="button"><span className="admin-action-label">Add customer</span></button></Hint>{message && <p className="admin-inline-success" role="status">{message}</p>}{error && <p className="admin-error" role="alert">{error}</p>}{editing && <form className="admin-operation-form admin-customer-form" onSubmit={save}><h2>{editing === "new" ? "Add customer" : "Edit customer"}</h2><label>Name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label><label>Notes<textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></label><div className="admin-form-actions"><Hint id="saveCustomer"><button className="admin-action-button" type="submit"><span className="admin-action-label">Save customer</span></button></Hint><Hint id="cancel"><button className="admin-secondary-button" onClick={() => setEditing(null)} type="button">Cancel</button></Hint></div></form>}
    <div className="admin-customer-list">{customers.map((customer) => { const purchases = customer.orders.filter((order) => order.order_status !== "cancelled"); const totals = new Map<string, number>(); purchases.forEach((order) => { const currency = order.currency ?? "PHP"; totals.set(currency, (totals.get(currency) ?? 0) + Number(order.amount ?? 0)); }); const totalLabel = Array.from(totals.entries()).map(([currency, amount]) => `${currency} ${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`).join(" · "); return <article className="admin-customer-card" key={customer.id}><div className="admin-customer-heading"><div><h2>{customer.name || "Unnamed customer"}</h2><p>{customer.email}{customer.phone ? ` · ${customer.phone}` : ""}</p></div><Hint id="edit"><button className="admin-small-button" onClick={() => start(customer)} type="button">Edit</button></Hint></div><div className="admin-customer-total">{purchases.length} purchase{purchases.length === 1 ? "" : "s"}{totalLabel ? ` · ${totalLabel}` : ""}</div>{purchases.length > 0 && <ul>{purchases.map((order) => <li key={order.id}>{order.work?.title ?? "Work removed"} · {order.sale_date} · {order.currency ?? "PHP"} {Number(order.amount ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</li>)}</ul>}</article>; })}</div>
  </section>;
}
