"use server";

import { createAdminClient } from "../../lib/supabase/admin";
import { createClient } from "../../lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const imageTypes = new Map([["jpg", "image/jpeg"], ["jpeg", "image/jpeg"], ["png", "image/png"], ["webp", "image/webp"], ["gif", "image/gif"], ["heic", "image/heic"], ["heif", "image/heif"]]);

export async function uploadArtworkImage(input: { workId: string; file: File; alt: string; displayOrder: number; isPrimary: boolean }) {
  const file = input.file;
  const filenameExtension = file?.name?.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  const contentType = imageTypes.get(filenameExtension);
  const isHeic = filenameExtension === "heic" || filenameExtension === "heif";
  const storageExtension = isHeic || filenameExtension === "jpeg" ? "jpg" : filenameExtension;
  const hasFileData = Boolean(file && typeof file.size === "number" && typeof file.arrayBuffer === "function");
  if (!UUID_PATTERN.test(input.workId) || !hasFileData || file.size <= 0 || file.size > MAX_IMAGE_BYTES) return { ok: false, error: "Images must be smaller than 10 MB." };
  if (!isCompatibleImageType(file.type, contentType, filenameExtension)) return { ok: false, error: "Use a JPG, PNG, WebP, GIF, HEIC, or HEIF image." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Not authorized." };
  let uploadBody: File | Buffer = file;
  let uploadContentType = contentType;
  if (isHeic) {
    try {
      const sharp = (await import("sharp")).default;
      uploadBody = await sharp(Buffer.from(await file.arrayBuffer())).jpeg({ quality: 92 }).toBuffer();
      uploadContentType = "image/jpeg";
    } catch (error) {
      console.error("[catalogue-upload] HEIC conversion failed", {
        filenameExtension,
        bytes: file.size,
        error: error instanceof Error ? error.message : String(error),
      });
      return { ok: false, error: "HEIC could not be converted. Please try a JPG or PNG copy of the image." };
    }
  }
  const path = `works/${input.workId}/${crypto.randomUUID()}.${storageExtension}`;
  const upload = await supabase.storage.from("artwork").upload(path, uploadBody, { contentType: uploadContentType, upsert: false });
  if (upload.error) return { ok: false, error: "Could not upload the image." };
  const { data, error } = await supabase.from("work_images").insert({ id: crypto.randomUUID(), work_id: input.workId, storage_path: path, alt: input.alt.trim().slice(0, 200) || "Artwork image", display_order: input.displayOrder, is_primary: input.isPrimary }).select("id").single();
  if (error || !data) {
    await supabase.storage.from("artwork").remove([path]);
    return { ok: false, error: "The image uploaded but could not be recorded." };
  }
  return { ok: true, id: data.id };
}

export async function deleteCatalogueWork(workId: string) {
  if (!UUID_PATTERN.test(workId)) return { ok: false, error: "Invalid work." };
  const caller = await createClient();
  if (!caller) return { ok: false, error: "Supabase is not configured." };
  const { data: isAdmin } = await caller.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Not authorized." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "The server catalogue service is not configured." };

  const { count: orderCount, error: orderError } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("work_id", workId);
  if (orderError) return { ok: false, error: "Could not verify the work’s sales history." };
  if ((orderCount ?? 0) > 0) return { ok: false, error: "Works with sales history cannot be deleted. Mark them sold instead." };

  const { data: images, error: imageError } = await admin
    .from("work_images")
    .select("storage_path")
    .eq("work_id", workId);
  if (imageError) return { ok: false, error: "Could not prepare the work for deletion." };

  const { error: workError } = await admin.from("works").delete().eq("id", workId);
  if (workError) return { ok: false, error: "Could not delete that work." };

  const paths = (images ?? []).map((image) => image.storage_path);
  if (paths.length) {
    const { error: storageError } = await admin.storage.from("artwork").remove(paths);
    if (storageError) return { ok: true, warning: "The work was deleted, but some image files need storage cleanup." };
  }

  return { ok: true };
}

function isCompatibleImageType(declaredType: string, expectedType: string | undefined, extension?: string) {
  if (!expectedType) return false;
  const normalizedType = declaredType.trim().toLowerCase();
  return !normalizedType
    || normalizedType === expectedType
    || normalizedType === "application/octet-stream"
    || (expectedType === "image/jpeg" && normalizedType === "image/jpg")
    || ((extension === "heic" || extension === "heif") && (normalizedType.startsWith("image/heic") || normalizedType.startsWith("image/heif") || normalizedType === "image/x-heic" || normalizedType === "image/x-heif"));
}
