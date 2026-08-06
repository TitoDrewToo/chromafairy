"use server";

import { createClient } from "../../lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const imageTypes = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["image/gif", "gif"]]);

export async function uploadArtworkImage(input: { workId: string; file: File; alt: string; displayOrder: number; isPrimary: boolean }) {
  if (!UUID_PATTERN.test(input.workId) || !(input.file instanceof File) || input.file.size <= 0 || input.file.size > MAX_IMAGE_BYTES) return { ok: false, error: "Images must be smaller than 10 MB." };
  const extension = imageTypes.get(input.file.type);
  const filenameExtension = input.file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (!extension || !filenameExtension || !["jpg", "jpeg", "png", "webp", "gif"].includes(filenameExtension)) return { ok: false, error: "Use a JPG, PNG, WebP, or GIF image." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Not authorized." };
  const path = `works/${input.workId}/${crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage.from("artwork").upload(path, input.file, { contentType: input.file.type, upsert: false });
  if (upload.error) return { ok: false, error: "Could not upload the image." };
  const { data, error } = await supabase.from("work_images").insert({ id: crypto.randomUUID(), work_id: input.workId, storage_path: path, alt: input.alt.trim().slice(0, 200) || "Artwork image", display_order: input.displayOrder, is_primary: input.isPrimary }).select("id").single();
  if (error || !data) {
    await supabase.storage.from("artwork").remove([path]);
    return { ok: false, error: "The image uploaded but could not be recorded." };
  }
  return { ok: true, id: data.id };
}
