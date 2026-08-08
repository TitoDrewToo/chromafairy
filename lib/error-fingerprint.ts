export function createErrorFingerprint(input: { tool?: string | null; fn?: string | null; action?: string | null; message: string }) {
  const normalized = [input.tool, input.fn, input.action, input.message.replace(/\s+/g, " ").trim().toLowerCase()].map((value) => value || "unknown").join("|");
  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
