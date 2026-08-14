"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import InquiryForm from "./inquiry-form";
import InquirySoundEffects from "./inquiry-sound-effects";

export default function WorkInquiryModal({ workId, workTitle }: { workId: string; workTitle: string }) {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.classList.add("inquiry-modal-open");
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("inquiry-modal-open");
    };
  }, [open]);

  function show() {
    window.dispatchEvent(new CustomEvent("cf-audio-effect", { detail: { name: "sparkle", volume: 0.08 } }));
    setOpen(true);
  }

  function hide() {
    window.dispatchEvent(new CustomEvent("cf-audio-effect", { detail: { name: "whoosh", volume: 0.08 } }));
    setOpen(false);
  }

  return (
    <>
      <InquirySoundEffects />
      <button className="shop-inquire inquiry-chroma-button" onClick={show} type="button"><span className="inquiry-chroma-label">Inquire about this work</span></button>
      {open && createPortal(<div className="shop-inquiry-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) hide(); }}>
        <section aria-labelledby="work-inquiry-title" aria-modal="true" className="shop-inquiry-modal" role="dialog">
          <button aria-label="Close inquiry" className="shop-inquiry-modal-close" onClick={hide} ref={closeButtonRef} type="button">×</button>
          <div className="shop-eyebrow">Piece inquiry</div>
          <h2 className="shop-inquiry-modal-title" id="work-inquiry-title">{workTitle}</h2>
          <p className="shop-inquiry-intro">Ask Samantha about this work, availability, or bringing its feeling into your space.</p>
          <InquiryForm kind="piece" workId={workId} workTitle={workTitle} />
        </section>
      </div>, document.body)}
    </>
  );
}
