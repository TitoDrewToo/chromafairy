"use client";

import { createPortal } from "react-dom";
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { studioHints, type StudioHintId } from "../lib/studio-hints";

type HintChildProps = { onMouseEnter?: (event: React.MouseEvent) => void; onMouseLeave?: (event: React.MouseEvent) => void; onFocus?: (event: React.FocusEvent) => void; onBlur?: (event: React.FocusEvent) => void; onKeyDown?: (event: React.KeyboardEvent) => void; "aria-describedby"?: string };

export function Hint({ id, children, className = "" }: { id: StudioHintId; children: ReactElement | ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"right" | "left" | "top" | "bottom">("bottom");
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

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const positionTooltip = () => {
      const anchor = anchorRef.current;
      const tooltip = document.getElementById(tooltipId);
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const tooltipWidth = tooltip?.offsetWidth ?? Math.min(320, window.innerWidth - 16);
      const tooltipHeight = tooltip?.offsetHeight ?? 54;
      const gap = 12;
      const isSidebar = Boolean(anchor.closest(".admin-nav"));
      if (isSidebar) {
        const useRight = rect.right + gap + tooltipWidth <= window.innerWidth - 8;
        const left = useRight ? rect.right + gap : Math.max(8, rect.left - gap - tooltipWidth);
        const top = Math.max(8, Math.min(window.innerHeight - tooltipHeight - 8, rect.top + (rect.height - tooltipHeight) / 2));
        setPlacement(useRight ? "right" : "left");
        setPosition({ left, top });
        return;
      }
      const useBottom = rect.bottom + gap + tooltipHeight <= window.innerHeight - 8;
      const left = Math.max(8, Math.min(window.innerWidth - tooltipWidth - 8, rect.left + (rect.width - tooltipWidth) / 2));
      const top = useBottom ? rect.bottom + gap : Math.max(8, rect.top - gap - tooltipHeight);
      setPlacement(useBottom ? "bottom" : "top");
      setPosition({ left, top });
    };
    const frame = window.requestAnimationFrame(positionTooltip);
    window.addEventListener("resize", positionTooltip);
    window.addEventListener("scroll", positionTooltip, true);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("resize", positionTooltip); window.removeEventListener("scroll", positionTooltip, true); };
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
  return <aside className="studio-welcome-card" role="note"><span>New here? Hover any button or link to see what it does.</span><Hint id="dismissWelcome"><button aria-label="Dismiss welcome message" onClick={() => { window.localStorage.setItem("studio.welcomeDismissed", "true"); setVisible(false); }} type="button">×</button></Hint></aside>;
}
