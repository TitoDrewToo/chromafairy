"use client";

import { createClient } from "./supabase/client";
import { createErrorFingerprint } from "./error-fingerprint";
import { sanitizeErrorContext, sanitizeErrorString } from "./error-sanitize";

function errorParts(error: unknown) {
  if (error instanceof Error) return { message: error.message, stack: error.stack ?? null };
  if (typeof error === "string") return { message: error, stack: null };
  try { return { message: JSON.stringify(error), stack: null }; } catch { return { message: String(error), stack: null }; }
}

export function captureError(tool: string, fn: string, action: string, error: unknown, context?: unknown) {
  try {
    const parts = errorParts(error);
    const message = sanitizeErrorString(parts.message || "Unknown client error");
    const safeTool = sanitizeErrorString(tool, 120);
    const safeFn = sanitizeErrorString(fn, 160);
    const safeAction = sanitizeErrorString(action, 160);
    const payload = {
      tool: safeTool,
      fn: safeFn,
      action: safeAction,
      route: window.location.pathname,
      message,
      stack: parts.stack ? sanitizeErrorString(parts.stack, 8_000) : null,
      fingerprint: createErrorFingerprint({ tool: safeTool, fn: safeFn, action: safeAction, message }),
      context: sanitizeErrorContext(context),
      environment: process.env.NODE_ENV,
    };
    const supabase = createClient();
    void (supabase ? supabase.auth.getSession() : Promise.resolve({ data: { session: null } })).then(({ data }) => fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}) },
      body: JSON.stringify(payload),
      keepalive: true,
    })).catch(() => undefined);
  } catch {
    // Client telemetry is best effort and must never surface as a second error.
  }
}
