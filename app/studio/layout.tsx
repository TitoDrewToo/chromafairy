import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Chroma Fairy Studio", template: "%s · Chroma Fairy Studio" },
};

export default function StudioLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
