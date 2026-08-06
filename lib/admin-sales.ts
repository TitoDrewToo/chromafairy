import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PackageType } from "./supabase/types";

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

export async function recordSale(supabase: SupabaseClient<Database>, input: SaleInput) {
  let customerId = input.customerId;
  if (!customerId) {
    const { data: existing, error: lookupError } = await supabase.from("customers").select("id").eq("email", input.customerEmail.toLowerCase()).maybeSingle();
    if (lookupError) throw new Error("Could not look up customer.");
    customerId = existing?.id;
  }
  if (customerId) {
    const { error } = await supabase.from("customers").update({ name: input.customerName, email: input.customerEmail.toLowerCase(), phone: input.customerPhone || null }).eq("id", customerId);
    if (error) throw new Error("Could not update customer.");
  } else {
    customerId = crypto.randomUUID();
    const { error } = await supabase.from("customers").insert({ id: customerId, name: input.customerName, email: input.customerEmail.toLowerCase(), phone: input.customerPhone || null });
    if (error) throw new Error(error.code === "23505" ? "A customer with that email already exists." : "Could not create customer.");
  }

  const orderId = crypto.randomUUID();
  const { error: orderError } = await supabase.from("orders").insert({
    id: orderId, work_id: input.workId, inquiry_id: input.inquiryId || null, customer_id: customerId,
    buyer_name: input.customerName, buyer_email: input.customerEmail.toLowerCase(), buyer_phone: input.customerPhone || null,
    amount: input.amount, currency: input.currency, payment_status: "paid", payment_provider: "manual", order_status: "paid",
    sale_date: input.saleDate, channel: input.channel || null, notes: input.notes || null,
  });
  if (orderError) throw new Error("Could not record the order.");

  const { error: workError } = await supabase.from("works").update({ status: "sold", sold_at: new Date().toISOString() }).eq("id", input.workId);
  if (workError) throw new Error("The order was recorded, but the work could not be marked sold.");

  if (input.shipment?.carrier || input.shipment?.trackingNumber) {
    const { error: shipmentError } = await supabase.from("shipments").insert({
      id: crypto.randomUUID(), order_id: orderId, carrier: input.shipment.carrier || null,
      tracking_number: input.shipment.trackingNumber || null, package_type: input.shipment.packageType, status: "pending",
    });
    if (shipmentError) throw new Error("The sale was recorded, but the shipment could not be added.");
  }
  return { orderId, customerId };
}
