"use server";

import { createAdminClient } from "../../lib/supabase/admin";
import { getBookableSlots } from "../../lib/public-booking";

export async function requestBooking(input: { name: string; email: string; slotStart: string; message: string }) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name || name.length > 100 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return { ok: false, error: "Please enter a valid name and email." };
  const slot = (await getBookableSlots()).find((item) => item.starts_at === input.slotStart);
  if (!slot) return { ok: false, error: "That slot is no longer available. Please choose another." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Booking is temporarily unavailable." };
  const { error } = await admin.from("appointments").insert({
    id: crypto.randomUUID(), title: `Consultation request — ${name}`, starts_at: slot.starts_at, ends_at: slot.ends_at,
    mode: "video", status: "requested", notes: `Name: ${name}\nEmail: ${email}\n\n${input.message.trim().slice(0, 2000)}`,
  });
  if (error) return { ok: false, error: "We couldn’t request that slot. Please try again." };
  return { ok: true };
}
