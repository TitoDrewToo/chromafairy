"use server";

import { createClient } from "../../lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const imageTypes = new Map([["jpg", "image/jpeg"], ["jpeg", "image/jpeg"], ["png", "image/png"], ["webp", "image/webp"], ["gif", "image/gif"], ["heic", "image/heic"], ["heif", "image/heif"]]);

export async function uploadArtworkImage(input: { workId: string; file: File; alt: string; displayOrder: number; isPrimary: boolean }) {
  const file = input.file;
  const filenameExtension = file?.name?.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  const contentType = imageTypes.get(filenameExtension);
  const storageExtension = filenameExtension === "jpeg" ? "jpg" : filenameExtension;
  const hasFileData = Boolean(file && typeof file.size === "number" && typeof file.arrayBuffer === "function");
  if (!UUID_PATTERN.test(input.workId) || !hasFileData || file.size <= 0 || file.size > MAX_IMAGE_BYTES) return { ok: false, error: "Images must be smaller than 10 MB." };
  if (!contentType || (file.type && file.type !== contentType)) return { ok: false, error: "Use a JPG, PNG, WebP, GIF, HEIC, or HEIF image." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Not authorized." };
  const path = `works/${input.workId}/${crypto.randomUUID()}.${storageExtension}`;
  const upload = await supabase.storage.from("artwork").upload(path, file, { contentType, upsert: false });
  if (upload.error) return { ok: false, error: "Could not upload the image." };
  const { data, error } = await supabase.from("work_images").insert({ id: crypto.randomUUID(), work_id: input.workId, storage_path: path, alt: input.alt.trim().slice(0, 200) || "Artwork image", display_order: input.displayOrder, is_primary: input.isPrimary }).select("id").single();
  if (error || !data) {
    await supabase.storage.from("artwork").remove([path]);
    return { ok: false, error: "The image uploaded but could not be recorded." };
  }
  return { ok: true, id: data.id };
}
