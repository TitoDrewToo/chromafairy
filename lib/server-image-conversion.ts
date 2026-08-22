import convertHeic from "heic-convert";

export async function convertHeicToJpeg(file: File): Promise<Buffer> {
  const input = Buffer.from(await file.arrayBuffer());
  return convertHeic({ buffer: input, format: "JPEG", quality: 0.92 });
}
