import convertHeic from "heic-convert";

export function isHeicFile(file: Pick<File, "name" | "type"> | null | undefined) {
  return Boolean(file && (/\.(heic|heif)$/i.test(file.name) || /image\/(heic|heif)(?:[-+].*)?$/i.test(file.type)));
}

export async function convertHeicToJpeg(file: File): Promise<Buffer> {
  const input = Buffer.from(await file.arrayBuffer());
  return convertHeic({ buffer: input, format: "JPEG", quality: 0.92 });
}
