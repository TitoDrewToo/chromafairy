export async function prepareArtworkFile(file: File): Promise<File> {
  if (!/\.(heic|heif)$/i.test(file.name)) return file;

  try {
    const { default: convert } = await import("heic2any");
    const converted = await convert({ blob: file, toType: "image/jpeg", quality: 0.9 });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    if (!(blob instanceof Blob)) throw new Error("HEIC conversion did not return an image");

    return new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch (error) {
    // Some iPhone HEIC containers cannot be decoded by the browser WASM
    // build. Keep the original so the server-side converter can handle it;
    // the UI will show its HEIC fallback instead of dropping the file.
    console.warn("[image-conversion] browser HEIC conversion unavailable; deferring to server", error);
    return file;
  }
}
