import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import HomeClient from "../components/home-client";
import { absoluteUrl } from "../lib/site";
import { getLandingPageContent } from "../lib/landing-page";
import { injectLandingMarkup } from "../lib/landing-page-html";

export const metadata: Metadata = {
  title: "Chroma Fairy",
  description: "Discover Samantha Ty’s fluid abstract paintings, commissions, exhibitions, and original works from the Philippines.",
  alternates: { canonical: "/" },
  openGraph: { title: "Chroma Fairy", description: "Fluid abstract paintings shaped by water, movement, and nature.", url: absoluteUrl("/"), images: [{ url: absoluteUrl("/fairy-logo-option-v2.png"), alt: "Chroma Fairy" }] },
  twitter: { card: "summary_large_image", title: "Chroma Fairy", description: "Fluid abstract paintings shaped by water, movement, and nature.", images: [absoluteUrl("/fairy-logo-option-v2.png")] },
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

export default async function HomePage() {
  const source = getHomeSource();
  const content = await getLandingPageContent({ publishedOnly: true });
  return <HomeClient {...source} markup={injectLandingMarkup(source.markup, content)} />;
}
