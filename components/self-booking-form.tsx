"use client";

import { useState } from "react";
import { requestBooking } from "../app/actions/public-booking";
import type { BookingSlot } from "../lib/public-booking-types";

export default function SelfBookingForm({ slots }: { slots: BookingSlot[] }) {
  const [slot, setSlot] = useState(slots[0]?.starts_at ?? ""); const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [success, setSuccess] = useState(false); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); const result = await requestBooking({ name, email, slotStart: slot, message }); setBusy(false); if (!result.ok) return setError(result.error ?? "Could not request that slot."); setSuccess(true); }
  if (success) return <p className="inquiry-success">Thank you — Samantha will be in touch to confirm your consultation.</p>;
  return <form className="shop-inquiry-form" onSubmit={submit}><label>Time<select required value={slot} onChange={(event) => setSlot(event.target.value)}>{slots.map((item) => <option key={item.starts_at} value={item.starts_at}>{item.label}</option>)}</select></label><label>Name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>What would you like to discuss?<textarea rows={4} value={message} onChange={(event) => setMessage(event.target.value)} /></label>{error && <p className="inquiry-error" role="alert">{error}</p>}<button className="shop-inquire inquiry-chroma-button" disabled={busy} type="submit"><span className="inquiry-chroma-label">{busy ? "Requesting…" : "Request consultation"}</span></button></form>;
}
