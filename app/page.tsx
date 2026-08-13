import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import HomeClient from "../components/home-client";
import { absoluteUrl } from "../lib/site";

export const metadata: Metadata = {
  title: "Chroma Fairy",
  description: "Discover Samantha Ty’s fluid abstract paintings, commissions, exhibitions, and original works from the Philippines.",
  alternates: { canonical: "/" },
  openGraph: { title: "Chroma Fairy", description: "Fluid abstract paintings shaped by water, movement, and nature.", url: absoluteUrl("/"), images: [{ url: absoluteUrl("/fairy-logo.png"), alt: "Chroma Fairy" }] },
  twitter: { card: "summary_large_image", title: "Chroma Fairy", description: "Fluid abstract paintings shaped by water, movement, and nature.", images: [absoluteUrl("/fairy-logo.png")] },
};

function getHomeSource() {
  const source = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf8");
  const styles = source.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
  const body = source.match(/<body>([\s\S]*?)<script>/)?.[1] ?? "";
  const markup = body
    .replace(/\s*<canvas id="art"><\/canvas>\s*<div id="artFallback"><\/div>/, "")
    .replaceAll('src="assets/', 'src="/assets/')
    .replace('      <a href="#contact">Contact</a>', '      <a href="#contact">Contact</a>\n      <a href="/shop">Shop</a>')
    .replace('<div class="brand2">Samantha Ty</div>', '<div class="brand2">Samantha Ty</div>');

  return { styles, markup };
}

export default function HomePage() {
  return <HomeClient {...getHomeSource()} />;
}
