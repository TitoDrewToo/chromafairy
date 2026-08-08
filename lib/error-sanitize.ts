const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const SENSITIVE_KEY_PATTERN = /(document|content|raw|source|body|email|password|secret|token|authorization|cookie|credential|inquiry)/i;
const MAX_OBJECT_KEYS = 40;
const MAX_ARRAY_ITEMS = 20;
const MAX_DEPTH = 4;

export function sanitizeErrorString(value: unknown, maxLength = 2_000) {
  return String(value ?? "").replace(EMAIL_PATTERN, "[redacted-email]").replace(BEARER_PATTERN, "Bearer [redacted-token]").slice(0, maxLength);
}

export function sanitizeErrorContext(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[truncated]";
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return sanitizeErrorString(value);
  if (Array.isArray(value)) return value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeErrorContext(item, depth + 1));
  if (typeof value !== "object") return undefined;
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value).slice(0, MAX_OBJECT_KEYS)) {
    result[sanitizeErrorString(key, 120)] = SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : sanitizeErrorContext(child, depth + 1);
  }
  return result;
}
