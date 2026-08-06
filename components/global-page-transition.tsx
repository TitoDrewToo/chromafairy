"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import AnimatedFairy from "./animated-fairy";

type BufferPhase = "loading" | "leaving" | "ready";

const BUFFER_LEAVE_MS = 680;
const BUFFER_TOTAL_MS = 980;
const ROUTE_TRANSITION_MS = 360;

export default function GlobalPageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const hasMounted = useRef(false);
  const [bufferPhase, setBufferPhase] = useState<BufferPhase>("loading");
  const [routeTransitioning, setRouteTransitioning] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setBufferPhase("ready");
      hasMounted.current = true;
      return;
    }

    const leaveTimer = window.setTimeout(() => setBufferPhase("leaving"), BUFFER_LEAVE_MS);
    const readyTimer = window.setTimeout(() => setBufferPhase("ready"), BUFFER_TOTAL_MS);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(readyTimer);
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
    setRouteTransitioning(true);
    const timer = window.setTimeout(() => setRouteTransitioning(false), ROUTE_TRANSITION_MS);
    return () => window.clearTimeout(timer);
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
