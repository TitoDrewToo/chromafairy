"use client";

import { createPortal } from "react-dom";
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { studioHints, type StudioHintId } from "../lib/studio-hints";

type HintChildProps = { onMouseEnter?: (event: React.MouseEvent) => void; onMouseLeave?: (event: React.MouseEvent) => void; onFocus?: (event: React.FocusEvent) => void; onBlur?: (event: React.FocusEvent) => void; onKeyDown?: (event: React.KeyboardEvent) => void; "aria-describedby"?: string };

export function Hint({ id, children, className = "" }: { id: StudioHintId; children: ReactElement | ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"top" | "bottom">("top");
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const anchorRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<number | null>(null);
  const tooltipId = `studio-hint-${id.replace(/[^a-z0-9_-]/gi, "-")}`;
  const text = studioHints[id];

  const dismiss = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setOpen(false);
  }, []);

  const reveal = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 150;
    timerRef.current = window.setTimeout(() => setOpen(true), delay);
  }, []);

  useEffect(() => () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current); }, []);

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const tooltipWidth = Math.min(320, window.innerWidth - 16);
    const left = Math.max(8, Math.min(window.innerWidth - tooltipWidth - 8, rect.left + rect.width / 2 - tooltipWidth / 2));
    const topSpace = rect.top - 12;
    const useTop = topSpace > 84;
    setPlacement(useTop ? "top" : "bottom");
    setPosition({ left, top: useTop ? Math.max(8, rect.top - 12) : Math.min(window.innerHeight - 8, rect.bottom + 12) });
  }, [open]);

  const element = isValidElement(children) ? children as ReactElement<HintChildProps> : null;
  const child = element
    // The wrapped control is intentionally cloned to attach aria-describedby and event handlers.
    // eslint-disable-next-line react-hooks/refs
    ? cloneElement(element, {
      "aria-describedby": open ? tooltipId : undefined,
      onMouseEnter: (event: React.MouseEvent) => { element.props.onMouseEnter?.(event); reveal(); },
      onMouseLeave: (event: React.MouseEvent) => { element.props.onMouseLeave?.(event); dismiss(); },
      onFocus: (event: React.FocusEvent) => { element.props.onFocus?.(event); reveal(); },
      onBlur: (event: React.FocusEvent) => { element.props.onBlur?.(event); dismiss(); },
      onKeyDown: (event: React.KeyboardEvent) => { element.props.onKeyDown?.(event); if (event.key === "Escape") dismiss(); },
    })
    : children;

  return (
    <span className={`studio-hint-anchor ${className}`} ref={anchorRef} onMouseLeave={dismiss}>
      {child}
      {open && typeof document !== "undefined" && createPortal(
        <span className={`studio-hint-tooltip is-${placement}`} id={tooltipId} role="tooltip" style={{ left: position.left, top: position.top }}>{text}</span>,
        document.body,
      )}
    </span>
  );
}

export function StudioWelcomeCard() {
  const [visible, setVisible] = useState(true);
  useEffect(() => setVisible(window.localStorage.getItem("studio.welcomeDismissed") !== "true"), []);
  if (!visible) return null;
  return <aside className="studio-welcome-card" role="note"><span>New here? Hover any button or link to see what it does.</span><button aria-label="Dismiss welcome message" onClick={() => { window.localStorage.setItem("studio.welcomeDismissed", "true"); setVisible(false); }} type="button">×</button></aside>;
}
