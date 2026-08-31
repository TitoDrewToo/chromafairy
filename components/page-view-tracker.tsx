"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export default function PageViewTracker() {
  const pathname = usePathname();
  const trackedPaths = useRef(new Set<string>());

  useEffect(() => {
    if (!pathname || pathname === "/studio" || pathname.startsWith("/studio/")) return;
    if (trackedPaths.current.has(pathname)) return;
    if (navigator.doNotTrack === "1" || navigator.doNotTrack === "yes") return;
    trackedPaths.current.add(pathname);

    const body = JSON.stringify({ path: pathname, referrer: document.referrer || null });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/track", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => undefined);
  }, [pathname]);

  return null;
}
