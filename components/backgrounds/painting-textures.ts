export const PAINTING_TEXTURES = [
  "/assets/paintings/01_IMG_8693.jpg",
  "/assets/paintings/02_IMG_8661.jpg",
  "/assets/paintings/03_IMG_5909.jpg",
  "/assets/paintings/04_IMG_5923.jpg",
  "/assets/paintings/05_IMG_8645.jpg",
  "/assets/paintings/06_IMG_R_0239.jpg",
  "/assets/paintings/07_IMG_3835.jpg",
  "/assets/paintings/08_IMG_8704.jpg",
  "/assets/paintings/09_IMG_2797.jpg",
  "/assets/paintings/10_IMG_2742.jpg",
  "/assets/paintings/11_IMG_1663.jpg",
] as const;

export type PaintingBackgroundVariant = "v1" | "v2" | "v3";

export function isPaintingBackgroundVariant(value: string | null): value is PaintingBackgroundVariant {
  return value === "v1" || value === "v2" || value === "v3";
}

