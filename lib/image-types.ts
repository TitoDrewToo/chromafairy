export const supportedImageExtensions = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"] as const;

export function imageExtension(fileName: string | null | undefined) {
  return fileName?.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
}

export function imageContentType(extension: string) {
  return ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", heic: "image/heic", heif: "image/heif" } as Record<string, string>)[extension];
}

export function isCompatibleImageType(declaredType: string, expectedType: string | undefined, extension?: string) {
  if (!expectedType) return false;
  const normalizedType = declaredType.trim().toLowerCase();
  const isHeic = extension === "heic" || extension === "heif";
  return !normalizedType
    || normalizedType === expectedType
    || normalizedType === "application/octet-stream"
    || normalizedType === "image/x-png"
    || (expectedType === "image/jpeg" && normalizedType === "image/jpg")
    || (isHeic && (normalizedType.startsWith("image/heic") || normalizedType.startsWith("image/heif") || normalizedType === "image/x-heic" || normalizedType === "image/x-heif"));
}
