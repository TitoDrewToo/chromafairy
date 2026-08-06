"use server";

import { createClient } from "../../lib/supabase/server";
import type { OrderStatus, PackageType } from "../../lib/supabase/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const currencies = ["PHP", "USD", "EUR"] as const;
const orderStatuses: OrderStatus[] = ["paid", "packed", "shipped", "delivered", "cancelled"];
const packageTypes: PackageType[] = ["flat", "rolled_tube", "crate"];

export type SaleInput = {
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  workId: string;
  inquiryId?: string;
  amount: number;
  currency: string;
  saleDate: string;
  channel: string;
  notes: string;
  shipment?: { carrier: string; trackingNumber: string; packageType: PackageType };
};

export async function recordSale(input: SaleInput) {
  const customerName = input.customerName.trim();
  const customerEmail = input.customerEmail.trim().toLowerCase();
  if (!customerName || customerName.length > 100 || !EMAIL_PATTERN.test(customerEmail) || customerEmail.length > 254 || !UUID_PATTERN.test(input.workId) || (input.customerId && !UUID_PATTERN.test(input.customerId)) || (input.inquiryId && !UUID_PATTERN.test(input.inquiryId)) || !Number.isFinite(input.amount) || input.amount < 0 || !currencies.includes(input.currency as typeof currencies[number]) || !/^\d{4}-\d{2}-\d{2}$/.test(input.saleDate) || input.channel.length > 100 || input.notes.length > 3000) {
    throw new Error("Please check the sale details.");
  }
  if (input.shipment && (!packageTypes.includes(input.shipment.packageType) || input.shipment.carrier.length > 100 || input.shipment.trackingNumber.length > 200)) throw new Error("Please check the shipment details.");

  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("record_sale", {
    p_customer_id: input.customerId || null,
    p_customer_name: customerName,
    p_customer_email: customerEmail,
    p_customer_phone: input.customerPhone.trim() || null,
    p_work_id: input.workId,
    p_inquiry_id: input.inquiryId || null,
    p_amount: input.amount,
    p_currency: input.currency,
    p_sale_date: input.saleDate,
    p_channel: input.channel.trim() || null,
    p_notes: input.notes.trim() || null,
    p_shipment: input.shipment ?? null,
  });
  if (error || !data) throw new Error(error?.message === "Work is not available for sale." ? error.message : "Could not record the sale.");
  return { orderId: data.order_id, customerId: data.customer_id };
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  if (!UUID_PATTERN.test(orderId) || !orderStatuses.includes(status)) return { ok: false, error: "Invalid order status." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Not authorized." };
  if (status === "cancelled") {
    const { error } = await supabase.rpc("cancel_order", { p_order_id: orderId });
    return error ? { ok: false, error: "Could not cancel that order." } : { ok: true };
  }
  const { error } = await supabase.from("orders").update({ order_status: status }).eq("id", orderId);
  return error ? { ok: false, error: "Could not update order status." } : { ok: true };
}
