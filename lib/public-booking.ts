import "server-only";

import { createAdminClient } from "./supabase/admin";
import type { Availability, Appointment } from "./supabase/types";
import type { BookingSlot } from "./public-booking-types";

export async function getBookableSlots(): Promise<BookingSlot[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data: flag } = await admin.from("feature_flags").select("enabled").eq("key", "self_booking").maybeSingle();
  if (!flag?.enabled) return [];
  const [{ data: availability }, { data: appointments }] = await Promise.all([
    admin.from("availability").select("*").in("kind", ["open", "blocked"]),
    admin.from("appointments").select("starts_at, ends_at, status").gte("starts_at", new Date().toISOString()).neq("status", "cancelled"),
  ]);
  return expandSlots((availability ?? []) as Availability[], (appointments ?? []) as Pick<Appointment, "starts_at" | "ends_at" | "status">[]);
}

function expandSlots(records: Availability[], appointments: Pick<Appointment, "starts_at" | "ends_at" | "status">[]) {
  const now = Date.now();
  const horizon = new Date(now + 60 * 24 * 60 * 60 * 1000);
  const opens = records.filter((record) => record.kind === "open").flatMap((record) => occurrences(record, horizon));
  const blocks = records.filter((record) => record.kind !== "open").flatMap((record) => occurrences(record, horizon));
  const slots: BookingSlot[] = [];
  for (const open of opens) {
    for (let start = open.starts.getTime(); start + 30 * 60 * 1000 <= open.ends.getTime(); start += 30 * 60 * 1000) {
      const end = start + 30 * 60 * 1000;
      if (start < now || blocks.some((block) => overlaps(start, end, block.starts.getTime(), block.ends.getTime())) || appointments.some((appointment) => appointment.starts_at && appointment.ends_at && appointment.status !== "cancelled" && overlaps(start, end, Date.parse(appointment.starts_at), Date.parse(appointment.ends_at)))) continue;
      const startsAt = new Date(start).toISOString();
      slots.push({ starts_at: startsAt, ends_at: new Date(end).toISOString(), label: new Date(start).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) });
    }
  }
  return slots.filter((slot, index, list) => list.findIndex((item) => item.starts_at === slot.starts_at) === index).slice(0, 80);
}

function occurrences(record: Availability, horizon: Date) {
  const baseStart = new Date(record.starts_at); const baseEnd = new Date(record.ends_at); const result: Array<{ starts: Date; ends: Date }> = [];
  const repeat = record.repeat ?? "none"; const until = record.repeat_until ? new Date(`${record.repeat_until}T23:59:59`) : horizon; const last = until < horizon ? until : horizon;
  if (repeat === "none") return baseEnd > new Date() ? [{ starts: baseStart, ends: baseEnd }] : [];
  for (let cursor = new Date(baseStart); cursor <= last; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const dayOffset = Math.floor((cursor.getTime() - baseStart.getTime()) / (24 * 60 * 60 * 1000));
    const matches = repeat === "daily" || (repeat === "weekly" && (record.repeat_days?.length ? record.repeat_days.includes(cursor.getUTCDay()) : cursor.getUTCDay() === baseStart.getUTCDay())) || (repeat === "monthly" && cursor.getUTCDate() === baseStart.getUTCDate());
    if (!matches) continue;
    const starts = new Date(baseStart); starts.setUTCDate(baseStart.getUTCDate() + dayOffset); const ends = new Date(baseEnd); ends.setUTCDate(baseEnd.getUTCDate() + dayOffset); result.push({ starts, ends });
  }
  return result;
}

function overlaps(start: number, end: number, otherStart: number, otherEnd: number) { return start < otherEnd && end > otherStart; }
