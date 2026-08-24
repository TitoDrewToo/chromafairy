"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import AnimatedFairy from "./animated-fairy";
import HomeAudio from "./home-audio";

type BufferPhase = "loading" | "leaving" | "ready";

const BUFFER_MIN_MS = 1200;
const BUFFER_READY_FADE_MS = 520;
const BUFFER_MAX_MS = 4800;
const ROUTE_TRANSITION_MS = 480;

function decodeViewportImages() {
  const images = Array.from(document.images).filter((image) => {
    const rect = image.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  });
  return Promise.all(images.map((image) => image.decode().catch(() => undefined)));
}

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
    const startedAt = performance.now();
    let imagesReady = false;
    let imageReadinessStarted = false;
    let backgroundReady = !isHome;
    let audioReady = !isHome;
    let finished = false;
    const finishWhenReady = () => {
      if (finished || !backgroundReady || !audioReady || !imagesReady) return;
      finished = true;
      const remainingMinTime = Math.max(0, BUFFER_MIN_MS - (performance.now() - startedAt));
      bufferLeaveTimer.current = window.setTimeout(() => setBufferPhase("leaving"), remainingMinTime);
      bufferReadyTimer.current = window.setTimeout(() => setBufferPhase("ready"), remainingMinTime + BUFFER_READY_FADE_MS);
    };
    const markImagesReady = () => {
      if (imageReadinessStarted || imagesReady) return;
      imageReadinessStarted = true;
      void decodeViewportImages().then(() => {
        imagesReady = true;
        finishWhenReady();
      });
    };
    const markBackgroundReady = () => { backgroundReady = true; finishWhenReady(); };
    const markAudioReady = () => { audioReady = true; finishWhenReady(); };
    const readinessProbe = window.setInterval(() => {
      markImagesReady();
      const audio = document.querySelector<HTMLAudioElement>("audio[data-home-ambient]");
      const canvas = document.querySelector<HTMLCanvasElement>("#global-background-layer canvas#art");
      const fallback = document.querySelector<HTMLElement>("#global-background-layer #artFallback");
      if (audio && audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) audioReady = true;
      if ((canvas && canvas.style.opacity === "1") || fallback?.style.display === "block") backgroundReady = true;
      finishWhenReady();
      if (finished) window.clearInterval(readinessProbe);
    }, 100);
    markImagesReady();
    const failSafe = window.setTimeout(() => {
      backgroundReady = true;
      audioReady = true;
      imagesReady = true;
      finishWhenReady();
    }, BUFFER_MAX_MS);
    window.addEventListener("cf-home-background-ready", markBackgroundReady);
    window.addEventListener("cf-home-audio-ready", markAudioReady);
    return () => {
      window.clearTimeout(failSafe);
      window.clearInterval(readinessProbe);
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

    setBufferPhase("loading");
    setRouteTransitioning(pathname !== "/");
    const startedAt = performance.now();
    let active = true;
    let finished = false;
    let failSafe: number | null = null;
    const finish = () => {
      if (!active || finished) return;
      finished = true;
      if (failSafe !== null) window.clearTimeout(failSafe);
      const remainingMinTime = Math.max(0, BUFFER_MIN_MS - (performance.now() - startedAt));
      bufferLeaveTimer.current = window.setTimeout(() => setBufferPhase("leaving"), remainingMinTime);
      bufferReadyTimer.current = window.setTimeout(() => setBufferPhase("ready"), remainingMinTime + BUFFER_READY_FADE_MS);
      routeTimer.current = window.setTimeout(() => setRouteTransitioning(false), ROUTE_TRANSITION_MS);
    };
    void decodeViewportImages().then(finish);
    failSafe = window.setTimeout(finish, BUFFER_MAX_MS);
    return () => {
      active = false;
      if (failSafe !== null) window.clearTimeout(failSafe);
      if (bufferLeaveTimer.current !== null) window.clearTimeout(bufferLeaveTimer.current);
      if (bufferReadyTimer.current !== null) window.clearTimeout(bufferReadyTimer.current);
      if (routeTimer.current !== null) window.clearTimeout(routeTimer.current);
    };
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
      <div className={frameClass}>
        {pathname === "/" ? <HomeAudio /> : null}
        {children}
      </div>
      {showBuffer && (
        <div aria-label="Loading Chroma Fairy" className={`global-fairy-buffer ${bufferPhase === "leaving" ? "is-leaving" : ""}`} role="status">
          <AnimatedFairy size={122} intensity={0.86} />
        </div>
      )}
    </>
  );
}
