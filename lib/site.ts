export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://chromafairy.com";
export const SITE_NAME = "Chroma Fairy";
export const SITE_DESCRIPTION = "Fluid abstract paintings by Samantha Ty — the life and essence of nature.";

export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}
