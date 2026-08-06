"use client";

import { FormEvent, useRef, useState } from "react";
import { notifyInquiry } from "../app/actions/inquiries";
import { validateInquiry, type InquiryFormValues } from "../lib/inquiry";
import { createClient } from "../lib/supabase/client";

type PieceInquiryFormProps = {
  kind: "piece";
  workId: string;
  workTitle: string;
};

type CommissionInquiryFormProps = {
  kind: "commission";
};

type InquiryFormProps = PieceInquiryFormProps | CommissionInquiryFormProps;

const initialValues: InquiryFormValues = { name: "", email: "", phone: "", message: "" };

export default function InquiryForm(props: InquiryFormProps) {
  const [values, setValues] = useState(initialValues);
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const startedAt = useRef(Date.now());
  const isPiece = props.kind === "piece";

  const update = (field: keyof InquiryFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (status === "error") setStatus("idle");
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (honeypot || Date.now() - startedAt.current < 1200) {
      setStatus("success");
      return;
    }

    const validationError = validateInquiry(values, !isPiece);
    if (validationError) {
      setError(validationError);
      setStatus("error");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("The inquiry form is temporarily unavailable. Please try again soon.");
      setStatus("error");
      return;
    }

    setStatus("sending");
    setError("");
    const inquiryId = crypto.randomUUID();
    const { error: insertError } = await supabase.from("inquiries").insert({
      id: inquiryId,
      type: props.kind,
      work_id: isPiece ? props.workId : null,
      work_title_snapshot: isPiece ? props.workTitle : null,
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim() || null,
      message: values.message.trim() || null,
      size_pref: null,
      palette_pref: null,
      space_for: null,
      budget_range: null,
      timeline: null,
      source: isPiece ? "shop" : "home",
      status: "new",
      notified_at: null,
    });

    if (insertError) {
      setError("We couldn’t send that just now. Please try again, or contact Samantha directly.");
      setStatus("error");
      return;
    }

    await notifyInquiry(inquiryId);
    setStatus("success");
    setValues(initialValues);
  }

  if (status === "success") {
    return <p className={isPiece ? "inquiry-success shop-inquiry-success" : "inquiry-success home-inquiry-success"}>Thank you — Samantha will be in touch.</p>;
  }

  return (
    <form className={isPiece ? "shop-inquiry-form" : "home-inquiry-form"} onSubmit={submit} noValidate>
      <input
        aria-hidden="true"
        autoComplete="off"
        className="inquiry-honeypot"
        name="website"
        tabIndex={-1}
        type="text"
        value={honeypot}
        onChange={(event) => setHoneypot(event.target.value)}
      />
      <input aria-label="Your name" name="name" placeholder="Your name" required value={values.name} onChange={(event) => update("name", event.target.value)} />
      <input aria-label="Email" autoComplete="email" name="email" placeholder="Email" required type="email" value={values.email} onChange={(event) => update("email", event.target.value)} />
      <input aria-label="Phone (optional)" autoComplete="tel" name="phone" placeholder="Phone (optional)" type="tel" value={values.phone} onChange={(event) => update("phone", event.target.value)} />
      <textarea aria-label="Message" name="message" placeholder={isPiece ? "Tell Samantha what you’d like to know…" : "Tell Samantha about your project…"} required={!isPiece} value={values.message} onChange={(event) => update("message", event.target.value)} />
      {error && <p className="inquiry-error" role="alert">{error}</p>}
      <button className={isPiece ? "shop-inquire inquiry-chroma-button" : "btn chroma-cta"} disabled={status === "sending"} type="submit">
        <span className={isPiece ? "inquiry-chroma-label" : "chroma-cta-label"}>{status === "sending" ? "Sending…" : isPiece ? "Send inquiry" : "Send message"}</span>
      </button>
    </form>
  );
}
