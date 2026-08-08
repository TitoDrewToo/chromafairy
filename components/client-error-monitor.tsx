"use client";

import { useEffect } from "react";
import { captureError, isBenignError } from "../lib/client-error-capture";

function toolForPath(pathname: string) {
  if (pathname.startsWith("/studio/catalogue")) return "studio-catalogue";
  if (pathname.startsWith("/studio/sales")) return "sales";
  if (pathname.startsWith("/studio/scheduling")) return "scheduling";
  if (pathname.startsWith("/studio/inquiries")) return "inquiries";
  if (pathname.startsWith("/studio")) return "systems";
  if (pathname.startsWith("/shop")) return "shop";
  if (pathname.startsWith("/inquire")) return "inquiries";
  return "systems";
}

export default function ClientErrorMonitor() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => { const error = event.error ?? event.message; if (isBenignError(error)) return; captureError(toolForPath(window.location.pathname), "window.error", "uncaught-error", error, { source: "window" }); };
    const handleRejection = (event: PromiseRejectionEvent) => { if (isBenignError(event.reason)) return; captureError(toolForPath(window.location.pathname), "window.unhandledrejection", "unhandled-rejection", event.reason, { source: "promise" }); };
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => { window.removeEventListener("error", handleError); window.removeEventListener("unhandledrejection", handleRejection); };
  }, []);
  return null;
}
