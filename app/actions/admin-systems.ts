"use server";

import { createAdminClient } from "../../lib/supabase/admin";
import { createClient } from "../../lib/supabase/server";
import type { ErrorGroup, ReviewVerdict } from "../../lib/supabase/types";
import { readFile } from "node:fs/promises";
import path from "node:path";

const statuses = ["new", "triaged", "resolved"] as const;
const verdicts: ReviewVerdict[] = ["matched", "partial", "wrong"];

type Diagnosis = { root_cause: string; affected_area: string; proposed_fix: string; risk_level: "low" | "medium" | "high"; confidence: number; severity: string; ai_model?: string };

async function canManage() {
  const caller = await createClient();
  if (!caller) return false;
  const { data } = await caller.rpc("is_user_manager");
  return data === true;
}

export async function updateErrorGroupStatus(fingerprint: string, status: string) {
  if (!/^[a-z0-9-]{1,128}$/i.test(fingerprint) || !statuses.includes(status as typeof statuses[number])) return { ok: false, error: "Invalid systems update." };
  if (!(await canManage())) return { ok: false, error: "Not authorized." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Systems service is not configured." };
  const { error } = await admin.from("error_groups").update({ status }).eq("fingerprint", fingerprint);
  return error ? { ok: false, error: "Could not update issue status." } : { ok: true };
}

export async function updateErrorReview(fingerprint: string, verdict: ReviewVerdict | null) {
  if (!/^[a-z0-9-]{1,128}$/i.test(fingerprint) || (verdict !== null && !verdicts.includes(verdict))) return { ok: false, error: "Invalid review." };
  const caller = await createClient();
  if (!caller) return { ok: false, error: "Supabase is not configured." };
  const { data: { user } } = await caller.auth.getUser();
  if (!user || !(await canManage())) return { ok: false, error: "Not authorized." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Systems service is not configured." };
  const { error } = await admin.from("error_groups").update({ review_verdict: verdict, reviewed_at: verdict ? new Date().toISOString() : null, reviewed_by: verdict ? user.id : null }).eq("fingerprint", fingerprint);
  return error ? { ok: false, error: "Could not save review." } : { ok: true };
}

async function journalSection(tool: string) {
  const journal = await readFile(path.join(process.cwd(), "docs", "System_Journal.md"), "utf8");
  const sections = journal.split(/^## /m).slice(1);
  const match = sections.find((section) => section.startsWith(`${tool} —`) || section.startsWith("systems —"));
  return match ? `## ${match}`.slice(0, 20_000) : "## systems — error monitoring and diagnosis\nUse the supplied sanitized error only. Diagnosis is observation-only.";
}

function validDiagnosis(value: unknown): value is Diagnosis {
  if (!value || typeof value !== "object") return false;
  const diagnosis = value as Record<string, unknown>;
  return typeof diagnosis.root_cause === "string" && typeof diagnosis.affected_area === "string" && typeof diagnosis.proposed_fix === "string" && ["low", "medium", "high"].includes(String(diagnosis.risk_level)) && typeof diagnosis.confidence === "number" && diagnosis.confidence >= 0 && diagnosis.confidence <= 1 && typeof diagnosis.severity === "string";
}

export async function diagnoseError(fingerprint: string, force = false) {
  if (!/^[a-z0-9-]{1,128}$/i.test(fingerprint)) return { ok: false, error: "Invalid error group." };
  if (!(await canManage())) return { ok: false, error: "Not authorized." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Systems service is not configured." };
  const { data: group, error: groupError } = await admin.from("error_groups").select("*").eq("fingerprint", fingerprint).maybeSingle();
  if (groupError || !group) return { ok: false, error: "Error group not found." };
  if (group.diagnosed_at && !force) return { ok: true, cached: true, group };
  const { data: events, error: eventsError } = await admin.from("error_events").select("occurred_at, tool, fn, action, route, level, message, stack, fingerprint, context, release, environment").eq("fingerprint", fingerprint).order("occurred_at", { ascending: false }).limit(20);
  if (eventsError) return { ok: false, error: "Could not load error occurrences." };
  const first = events?.[0];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SYSTEMS_INTERNAL_SECRET;
  if (!url || !secret) return { ok: false, error: "Systems diagnosis is not configured." };
  try {
    const response = await fetch(`${url}/functions/v1/diagnose-error`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ fingerprint, journal_section: await journalSection(first?.tool ?? "systems"), error: { ...first, context: first?.context ?? {} } }),
      signal: AbortSignal.timeout(35_000),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !validDiagnosis(result)) return { ok: false, error: result?.error || "Diagnosis failed." };
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await admin.from("error_groups").update({ ai_analysis: `Root cause: ${result.root_cause}\nAffected area: ${result.affected_area}`, proposed_fix: result.proposed_fix, risk_level: result.risk_level, confidence: result.confidence, severity: result.severity, diagnosed_at: now, ai_model: result.ai_model || process.env.ANTHROPIC_SYSTEMS_MODEL || "claude-haiku-4-5-20251001", status: group.status === "new" ? "triaged" : group.status }).eq("fingerprint", fingerprint).select("*").single();
    if (updateError || !updated) return { ok: false, error: "Diagnosis returned, but could not be saved." };
    return { ok: true, cached: false, group: updated as ErrorGroup };
  } catch { return { ok: false, error: "Diagnosis timed out or was unavailable." }; }
}
