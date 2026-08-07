"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import AnimatedFairy from "./animated-fairy";

type BufferPhase = "loading" | "leaving" | "ready";

const BUFFER_LEAVE_MS = 1340;
const BUFFER_TOTAL_MS = 1640;
const ROUTE_TRANSITION_MS = 360;

export default function GlobalPageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const hasMounted = useRef(false);
  const bufferLeaveTimer = useRef<number | null>(null);
  const bufferReadyTimer = useRef<number | null>(null);
  const routeTimer = useRef<number | null>(null);
  const [bufferPhase, setBufferPhase] = useState<BufferPhase>("loading");
  const [routeTransitioning, setRouteTransitioning] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setBufferPhase("ready");
      hasMounted.current = true;
      return;
    }

    bufferLeaveTimer.current = window.setTimeout(() => setBufferPhase("leaving"), BUFFER_LEAVE_MS);
    bufferReadyTimer.current = window.setTimeout(() => setBufferPhase("ready"), BUFFER_TOTAL_MS);
    return () => {
      if (bufferLeaveTimer.current !== null) window.clearTimeout(bufferLeaveTimer.current);
      if (bufferReadyTimer.current !== null) window.clearTimeout(bufferReadyTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      previousPathname.current = pathname;
      return;
    }
    if (previousPathname.current === pathname || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    previousPathname.current = pathname;

    if (bufferLeaveTimer.current !== null) window.clearTimeout(bufferLeaveTimer.current);
    if (bufferReadyTimer.current !== null) window.clearTimeout(bufferReadyTimer.current);
    if (routeTimer.current !== null) window.clearTimeout(routeTimer.current);

    if (pathname === "/") {
      setRouteTransitioning(false);
      setBufferPhase("loading");
      bufferLeaveTimer.current = window.setTimeout(() => setBufferPhase("leaving"), BUFFER_LEAVE_MS);
      bufferReadyTimer.current = window.setTimeout(() => setBufferPhase("ready"), BUFFER_TOTAL_MS);
      return;
    }

    setBufferPhase("ready");
    setRouteTransitioning(true);
    routeTimer.current = window.setTimeout(() => setRouteTransitioning(false), ROUTE_TRANSITION_MS);
  }, [pathname]);

  const showBuffer = bufferPhase !== "ready";
  const frameClass = [
    "global-page-frame",
    showBuffer ? "is-buffering" : "is-ready",
    routeTransitioning ? "is-route-transitioning" : "",
  ].filter(Boolean).join(" ");

  return (
    <>
      <div aria-hidden="true" id="global-background-layer" />
      <div className={frameClass}>{children}</div>
      {showBuffer && (
        <div aria-label="Loading Chroma Fairy" className={`global-fairy-buffer ${bufferPhase === "leaving" ? "is-leaving" : ""}`} role="status">
          <AnimatedFairy size={122} intensity={0.86} />
        </div>
      )}
    </>
  );
}
