// @ts-nocheck — compiled by the Supabase Edge/Deno runtime, not Next.js.

const SYSTEMS_INTERNAL_SECRET = Deno.env.get("SYSTEMS_INTERNAL_SECRET") ?? ""
const ANTHROPIC_SYSTEMS_API_KEY = Deno.env.get("ANTHROPIC_SYSTEMS_API_KEY") ?? ""
const ANTHROPIC_SYSTEMS_MODEL = Deno.env.get("ANTHROPIC_SYSTEMS_MODEL") ?? "claude-haiku-4-5-20251001"

const SYSTEM_PROMPT = `You are Chroma Fairy Studio's internal error-triage assistant operating in observation mode.
Use only the supplied sanitized error fields and relevant system-journal section.
Never request, infer, reproduce, or mention raw customer content, full emails, image contents, secrets, tokens, or unrelated personal data.
Do not execute code or change production. proposed_fix is a human-readable suggestion for an engineer to review.
Return ONLY strict JSON with exactly these fields:
{
  "root_cause": "...",
  "affected_area": "...",
  "proposed_fix": "...",
  "risk_level": "low" | "medium" | "high",
  "confidence": 0.0,
  "severity": "...",
  "needs_more": { "time": false, "topic": false }
}
Confidence must be a number from 0 to 1. If evidence is incomplete, say so and lower confidence.`

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } })
}

function safeString(value: unknown, max: number): string | null {
  if (typeof value !== "string" || !value.trim()) return null
  return value.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]").replace(/\bBearer\s+\S+/gi, "Bearer [redacted-token]").slice(0, max)
}

function safeContext(value: unknown): unknown {
  if (value === null || typeof value === "boolean" || typeof value === "number") return value
  if (typeof value === "string") return safeString(value, 2_000)
  if (Array.isArray(value)) return value.slice(0, 20).map(safeContext)
  if (!value || typeof value !== "object") return null
  const result: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value).slice(0, 40)) {
    if (/(email|body|content|document|inquiry|image|secret|token|password|cookie)/i.test(key)) result[key] = "[redacted]"
    else result[safeString(key, 100) ?? "field"] = safeContext(child)
  }
  return result
}

function parseDiagnosis(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  let parsed: Record<string, unknown>
  try { parsed = JSON.parse(cleaned) } catch {
    const start = cleaned.indexOf("{"); const end = cleaned.lastIndexOf("}")
    if (start < 0 || end <= start) throw new Error("Anthropic returned non-JSON diagnosis")
    parsed = JSON.parse(cleaned.slice(start, end + 1))
  }
  const rootCause = safeString(parsed.root_cause, 4_000)
  const affectedArea = safeString(parsed.affected_area, 1_000)
  const proposedFix = safeString(parsed.proposed_fix, 4_000)
  const riskLevel = parsed.risk_level
  const confidence = parsed.confidence
  const severity = safeString(parsed.severity, 80)
  const needsMore = parsed.needs_more && typeof parsed.needs_more === "object" ? parsed.needs_more as Record<string, unknown> : {}
  if (!rootCause || !affectedArea || !proposedFix || !severity || !["low", "medium", "high"].includes(String(riskLevel))) throw new Error("Diagnosis failed schema validation")
  if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new Error("Diagnosis confidence is invalid")
  return { root_cause: rootCause, affected_area: affectedArea, proposed_fix: proposedFix, risk_level: riskLevel, confidence, severity, needs_more: { time: needsMore.time === true, topic: needsMore.topic === true } }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "POST required" }, 405)
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!SYSTEMS_INTERNAL_SECRET || token !== SYSTEMS_INTERNAL_SECRET) return json({ error: "Internal systems secret required" }, 401)
  try {
    if (!ANTHROPIC_SYSTEMS_API_KEY) return json({ error: "Anthropic systems key is not configured" }, 503)
    const body = await request.json()
    const fingerprint = safeString(body?.fingerprint, 128)
    const journal = safeString(body?.journal_section, 20_000)
    const error = body?.error
    if (!fingerprint || !journal || !error || typeof error !== "object") return json({ error: "Invalid diagnosis payload" }, 400)
    const safeError = {
      message: safeString(error.message, 2_000) ?? "Unknown error",
      stack: safeString(error.stack, 8_000),
      tool: safeString(error.tool, 120), fn: safeString(error.fn, 160), action: safeString(error.action, 160),
      route: safeString(error.route, 500), context: safeContext(error.context),
    }
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_SYSTEMS_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: ANTHROPIC_SYSTEMS_MODEL, max_tokens: 900, temperature: 0, system: SYSTEM_PROMPT, messages: [{ role: "user", content: ["RELEVANT SYSTEM JOURNAL SECTION:", journal, "\nSANITIZED ERROR:", JSON.stringify(safeError), "\nReturn the exact JSON contract."].join("\n") }] }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) return json({ error: `Anthropic diagnosis failed with HTTP ${response.status}` }, 502)
    const bodyJson = await response.json()
    const text = bodyJson?.content?.find((block: { type?: string }) => block.type === "text")?.text
    if (typeof text !== "string") throw new Error("Anthropic returned an empty diagnosis")
    return json({ ...parseDiagnosis(text), ai_model: ANTHROPIC_SYSTEMS_MODEL })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Diagnosis failed" }, 502)
  }
})
