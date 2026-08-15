"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import AnimatedFairy from "./animated-fairy";

type BufferPhase = "loading" | "leaving" | "ready";

const BUFFER_MIN_MS = 720;
const BUFFER_READY_FADE_MS = 320;
const BUFFER_MAX_MS = 3200;
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

    const isHome = window.location.pathname === "/";
    if (!isHome) {
      bufferLeaveTimer.current = window.setTimeout(() => setBufferPhase("leaving"), BUFFER_MIN_MS);
      bufferReadyTimer.current = window.setTimeout(() => setBufferPhase("ready"), BUFFER_MIN_MS + BUFFER_READY_FADE_MS);
      return () => {
        if (bufferLeaveTimer.current !== null) window.clearTimeout(bufferLeaveTimer.current);
        if (bufferReadyTimer.current !== null) window.clearTimeout(bufferReadyTimer.current);
      };
    }

    const startedAt = performance.now();
    let backgroundReady = false;
    let audioReady = false;
    let finished = false;
    const finishWhenReady = () => {
      if (finished || !backgroundReady || !audioReady) return;
      finished = true;
      const remainingMinTime = Math.max(0, BUFFER_MIN_MS - (performance.now() - startedAt));
      bufferLeaveTimer.current = window.setTimeout(() => setBufferPhase("leaving"), remainingMinTime);
      bufferReadyTimer.current = window.setTimeout(() => setBufferPhase("ready"), remainingMinTime + BUFFER_READY_FADE_MS);
    };
    const markBackgroundReady = () => { backgroundReady = true; finishWhenReady(); };
    const markAudioReady = () => { audioReady = true; finishWhenReady(); };
    const failSafe = window.setTimeout(() => {
      backgroundReady = true;
      audioReady = true;
      finishWhenReady();
    }, BUFFER_MAX_MS);
    window.addEventListener("cf-home-background-ready", markBackgroundReady);
    window.addEventListener("cf-home-audio-ready", markAudioReady);
    return () => {
      window.clearTimeout(failSafe);
      if (bufferLeaveTimer.current !== null) window.clearTimeout(bufferLeaveTimer.current);
      if (bufferReadyTimer.current !== null) window.clearTimeout(bufferReadyTimer.current);
      window.removeEventListener("cf-home-background-ready", markBackgroundReady);
      window.removeEventListener("cf-home-audio-ready", markAudioReady);
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
      bufferLeaveTimer.current = window.setTimeout(() => setBufferPhase("leaving"), BUFFER_MIN_MS);
      bufferReadyTimer.current = window.setTimeout(() => setBufferPhase("ready"), BUFFER_MIN_MS + BUFFER_READY_FADE_MS);
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
