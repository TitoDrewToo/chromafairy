"use client";

import { useEffect, useState } from "react";

type LaunchPhase = "visible" | "leaving" | "hidden";
const SESSION_KEY = "chroma-fairy:launch-seen";

export default function FairyLaunch({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<LaunchPhase>("visible");

  useEffect(() => {
    if (window.sessionStorage.getItem(SESSION_KEY) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.sessionStorage.setItem(SESSION_KEY, "1");
      setPhase("hidden");
      return;
    }

    window.sessionStorage.setItem(SESSION_KEY, "1");
    const leaveTimer = window.setTimeout(() => setPhase("leaving"), 520);
    const hideTimer = window.setTimeout(() => setPhase("hidden"), 880);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  return (
    <>
      {children}
      {phase !== "hidden" && (
        <div aria-label="Opening Chroma Fairy" className={`fairy-launch ${phase === "leaving" ? "is-leaving" : ""}`}>
          <div className="fairy-launch-mark">
            <img alt="Chroma Fairy" className="fairy-launch-logo" src="/fairy-logo.png" />
            <span aria-hidden="true" className="fairy-launch-chroma" />
          </div>
        </div>
      )}
    </>
  );
}
