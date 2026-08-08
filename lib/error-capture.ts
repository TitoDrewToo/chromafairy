import "server-only";

import { createAdminClient } from "./supabase/admin";
import { createErrorFingerprint } from "./error-fingerprint";
import { sanitizeErrorContext, sanitizeErrorString } from "./error-sanitize";

export type CapturedError = {
  userId?: string | null;
  tool?: string | null;
  fn?: string | null;
  action?: string | null;
  route?: string | null;
  level?: "error" | "warn" | "info";
  message: string;
  stack?: string | null;
  context?: unknown;
  release?: string | null;
  environment?: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function persistErrorEvent(input: CapturedError) {
  try {
    const client = createAdminClient();
    if (!client) return false;
    const tool = input.tool ? sanitizeErrorString(input.tool, 120) : "systems";
    const fn = input.fn ? sanitizeErrorString(input.fn, 160) : "unknown";
    const action = input.action ? sanitizeErrorString(input.action, 160) : null;
    const message = sanitizeErrorString(input.message || "Unknown error") || "Unknown error";
    const { error } = await client.rpc("record_error_event", {
      p_user_id: input.userId && UUID_PATTERN.test(input.userId) ? input.userId : null,
      p_tool: tool,
      p_fn: fn,
      p_action: action,
      p_route: input.route ? sanitizeErrorString(input.route, 500) : null,
      p_level: input.level ?? "error",
      p_message: message,
      p_stack: input.stack ? sanitizeErrorString(input.stack, 8_000) : null,
      p_fingerprint: createErrorFingerprint({ tool, fn, action, message }),
      p_context: (sanitizeErrorContext(input.context) ?? {}) as Record<string, unknown>,
      p_release: input.release ? sanitizeErrorString(input.release, 120) : null,
      p_environment: input.environment ? sanitizeErrorString(input.environment, 80) : process.env.NODE_ENV,
    });
    return !error;
  } catch {
    // Observability must never become a second outage or recurse into itself.
    return false;
  }
}

export function captureServerError(input: CapturedError) {
  void persistErrorEvent(input);
}
