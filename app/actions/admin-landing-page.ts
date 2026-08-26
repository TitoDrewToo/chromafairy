"use server";

import { createClient } from "../../lib/supabase/server";
import { convertHeicToJpeg, isHeicFile } from "../../lib/server-image-conversion";
import { imageContentType, imageExtension, isCompatibleImageType, supportedImageExtensions } from "../../lib/image-types";
import type { LandingItemType, LandingMedia, LandingSectionKey } from "../../lib/supabase/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SECTION_LIMITS: Record<LandingSectionKey, number> = { collections: 3, exhibitions: 3, press: 9, gallery: 3 };
const SECTION_TYPES: Record<LandingSectionKey, LandingItemType[]> = {
  collections: ["collection"], exhibitions: ["exhibition"], press: ["press_image", "press_text"], gallery: ["gallery"],
};
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type SectionInput = { sectionId: string; sectionKey: LandingSectionKey; eyebrow: string; title: string; body: string; isPublished: boolean };
type ItemInput = { id: string; sectionId: string; sectionKey: LandingSectionKey; itemType: LandingItemType; eyebrow: string; title: string; subtitle: string; body: string; source: string; linkUrl: string; linkLabel: string; media: LandingMedia[]; displayOrder: number; isPublished: boolean };

export async function updateLandingSection(input: SectionInput) {
  const auth = await authorize();
  if (!auth.ok) return auth;
  if (!UUID_PATTERN.test(input.sectionId) || !isSectionKey(input.sectionKey)) return { ok: false, error: "Invalid landing section." };
  const { error } = await auth.supabase.from("landing_sections").update({ eyebrow: clean(input.eyebrow, 160), title: clean(input.title, 240), body: clean(input.body, 4000), is_published: Boolean(input.isPublished) }).eq("id", input.sectionId).eq("section_key", input.sectionKey);
  return error ? { ok: false, error: "Could not save that section." } : { ok: true };
}

export async function upsertLandingItem(input: ItemInput) {
  const auth = await authorize();
  if (!auth.ok) return auth;
  if (!UUID_PATTERN.test(input.id) || !UUID_PATTERN.test(input.sectionId) || !isSectionKey(input.sectionKey) || !SECTION_TYPES[input.sectionKey].includes(input.itemType)) return { ok: false, error: "Invalid landing entry." };
  const { data: section, error: sectionError } = await auth.supabase.from("landing_sections").select("section_key").eq("id", input.sectionId).maybeSingle();
  if (sectionError || !section || section.section_key !== input.sectionKey) return { ok: false, error: "That landing section could not be verified." };
  const { count, error: countError } = await auth.supabase.from("landing_items").select("id", { count: "exact", head: true }).eq("section_id", input.sectionId);
  if (countError) return { ok: false, error: "Could not verify landing entry limits." };
  const { data: existing } = await auth.supabase.from("landing_items").select("id, section_id").eq("id", input.id).maybeSingle();
  if (existing && existing.section_id !== input.sectionId) return { ok: false, error: "That landing entry belongs to another section." };
  if (!existing && (count ?? 0) >= SECTION_LIMITS[input.sectionKey]) return { ok: false, error: `This section is limited to ${SECTION_LIMITS[input.sectionKey]} entries.` };
  if (!validLink(input.linkUrl)) return { ok: false, error: "Links must begin with https://, http://, /, or #." };
  const media = normalizeMedia(input.media, input.sectionKey, input.itemType);
  if (!media.ok) return media;
  const { data, error } = await auth.supabase.from("landing_items").upsert({ id: input.id, section_id: input.sectionId, item_type: input.itemType, eyebrow: clean(input.eyebrow, 160), title: clean(input.title, 240), subtitle: clean(input.subtitle, 500), body: clean(input.body, 4000), source: clean(input.source, 240), link_url: clean(input.linkUrl, 1000), link_label: clean(input.linkLabel, 240), media: media.value, display_order: Math.max(0, Math.floor(input.displayOrder)), is_published: Boolean(input.isPublished) }).select("created_at").single();
  return error || !data ? { ok: false, error: "Could not save that landing entry." } : { ok: true, createdAt: data.created_at };
}

export async function deleteLandingItem(itemId: string) {
  const auth = await authorize();
  if (!auth.ok) return auth;
  if (!UUID_PATTERN.test(itemId)) return { ok: false, error: "Invalid landing entry." };
  const { data: entry, error: readError } = await auth.supabase.from("landing_items").select("media").eq("id", itemId).maybeSingle();
  if (readError || !entry) return { ok: false, error: "That landing entry could not be found." };
  const { error } = await auth.supabase.from("landing_items").delete().eq("id", itemId);
  if (error) return { ok: false, error: "Could not remove that landing entry." };
  const paths = normalizeStoredPaths(entry.media);
  if (paths.length) await auth.supabase.storage.from("artwork").remove(paths);
  return { ok: true };
}

export async function reorderLandingItems(sectionId: string, orderedIds: string[]) {
  const auth = await authorize();
  if (!auth.ok) return auth;
  if (!UUID_PATTERN.test(sectionId) || orderedIds.length > 9 || orderedIds.some((id) => !UUID_PATTERN.test(id))) return { ok: false, error: "Invalid landing order." };
  const { data: rows, error: readError } = await auth.supabase.from("landing_items").select("id").eq("section_id", sectionId);
  if (readError || new Set(rows?.map((row) => row.id)).size !== orderedIds.length || rows?.some((row) => !orderedIds.includes(row.id))) return { ok: false, error: "The landing entries changed. Refresh and try again." };
  const results = await Promise.all(orderedIds.map((id, index) => auth.supabase.from("landing_items").update({ display_order: index }).eq("id", id).eq("section_id", sectionId)));
  return results.some((result) => result.error) ? { ok: false, error: "Could not reorder that section." } : { ok: true };
}

export async function uploadLandingImage(input: { sectionKey: LandingSectionKey; file: File }) {
  const auth = await authorize();
  if (!auth.ok) return auth;
  const extension = imageExtension(input.file?.name);
  const isHeic = isHeicFile(input.file);
  const declaredType = input.file?.type?.toLowerCase() ?? "";
  const expectedType = imageContentType(extension);
  const typeMatches = isCompatibleImageType(declaredType, expectedType, extension);
  if (!isSectionKey(input.sectionKey) || !input.file || input.file.size <= 0 || input.file.size > MAX_IMAGE_BYTES || !typeMatches || !supportedImageExtensions.includes(extension as typeof supportedImageExtensions[number])) return { ok: false, error: "Use a JPG, PNG, WebP, GIF, HEIC, or HEIF image up to 10 MB." };
  let uploadBody: File | Buffer = input.file;
  let uploadContentType = expectedType ?? "application/octet-stream";
  if (isHeic) {
    try {
      uploadBody = await convertHeicToJpeg(input.file);
      uploadContentType = "image/jpeg";
    } catch (error) {
      console.error("[landing-upload] HEIC conversion failed", { fileName: input.file.name, error });
      return { ok: false, error: "HEIC could not be converted. Please try a JPG or PNG copy of the image." };
    }
  }
  const storageExtension = isHeic || extension === "jpeg" ? "jpg" : extension;
  const path = `landing/${input.sectionKey}/${crypto.randomUUID()}.${storageExtension}`;
  const { error } = await auth.supabase.storage.from("artwork").upload(path, uploadBody, { contentType: uploadContentType, upsert: false });
  return error ? { ok: false, error: "Could not upload that landing image." } : { ok: true, path };
}

async function authorize() {
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: "Supabase is not configured." };
  const { data: allowed } = await supabase.rpc("is_admin");
  return allowed ? { ok: true as const, supabase } : { ok: false as const, error: "Not authorized." };
}
function isSectionKey(value: string): value is LandingSectionKey { return value === "collections" || value === "exhibitions" || value === "press" || value === "gallery"; }
function clean(value: string, max: number) { return String(value ?? "").trim().slice(0, max); }
function validLink(value: string) { return !value || /^(https?:\/\/|\/|#)/i.test(value); }
function normalizeMedia(values: LandingMedia[], sectionKey: LandingSectionKey, itemType: LandingItemType): { ok: true; value: LandingMedia[] } | { ok: false; error: string } {
  const max = sectionKey === "collections" ? 3 : 1;
  if (!Array.isArray(values) || values.length > max) return { ok: false, error: `This entry supports up to ${max} image${max === 1 ? "" : "s"}.` };
  if (sectionKey !== "press" && !values.length) return { ok: false, error: "This entry needs an image." };
  if (itemType === "press_text" && values.length) return { ok: false, error: "Text-only press entries cannot contain an image." };
  return { ok: true, value: values.map((value) => ({ path: clean(toStoredArtworkPath(value.path), 1000), alt: clean(value.alt, 240), label: clean(value.label, 240) })).filter((value) => value.path) };
}
function toStoredArtworkPath(value: string) {
  const marker = "/storage/v1/object/public/artwork/";
  if (!value.includes(marker)) return value;
  try { return decodeURIComponent(value.slice(value.indexOf(marker) + marker.length)); } catch { return value; }
}
function normalizeStoredPaths(value: unknown): string[] { return Array.isArray(value) ? value.map((item) => item && typeof item.path === "string" ? item.path : "").filter((path) => path.startsWith("landing/")) : []; }
