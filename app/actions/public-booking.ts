"use server";

import { createAdminClient } from "../../lib/supabase/admin";
import { getBookableSlots } from "../../lib/public-booking";

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 3;
const bookingAttempts = new Map<string, { count: number; startedAt: number }>();

export async function requestBooking(input: unknown) {
  if (!input || typeof input !== "object") return { ok: false, error: "Please enter valid booking details." };
  const details = input as Record<string, unknown>;
  const name = typeof details.name === "string" ? details.name.trim() : "";
  const email = typeof details.email === "string" ? details.email.trim().toLowerCase() : "";
  const slotStart = typeof details.slotStart === "string" ? details.slotStart : "";
  const message = typeof details.message === "string" ? details.message.trim() : "";
  if (!name || name.length > 100 || !EMAIL_PATTERN.test(email) || email.length > 254 || message.length > 2000 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(slotStart) || Number.isNaN(Date.parse(slotStart))) return { ok: false, error: "Please enter valid booking details." };
  if (!allowBooking(email)) return { ok: false, error: "Too many booking requests. Please try again later." };
  const slot = (await getBookableSlots()).find((item) => item.starts_at === slotStart);
  if (!slot) return { ok: false, error: "That slot is no longer available. Please choose another." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Booking is temporarily unavailable." };
  const { error } = await admin.rpc("request_public_booking", { p_name: name, p_email: email, p_slot_start: slot.starts_at, p_message: message });
  if (error) return { ok: false, error: "We couldn’t request that slot. Please try again." };
  return { ok: true };
}

function allowBooking(key: string) {
  const now = Date.now();
  for (const [storedKey, attempt] of bookingAttempts) if (now - attempt.startedAt > RATE_WINDOW_MS) bookingAttempts.delete(storedKey);
  const attempt = bookingAttempts.get(key);
  if (!attempt || now - attempt.startedAt > RATE_WINDOW_MS) { bookingAttempts.set(key, { count: 1, startedAt: now }); return true; }
  if (attempt.count >= RATE_LIMIT) return false;
  attempt.count += 1;
  return true;
}
