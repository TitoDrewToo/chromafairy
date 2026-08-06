import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import HomeClient from "../components/home-client";
import { absoluteUrl } from "../lib/site";

export const metadata: Metadata = {
  title: "Fluid Abstract Artist Samantha Ty",
  description: "Discover Samantha Ty’s fluid abstract paintings, commissions, exhibitions, and original works from the Philippines.",
  alternates: { canonical: "/" },
  openGraph: { title: "Fluid Abstract Artist Samantha Ty", description: "Fluid abstract paintings shaped by water, movement, and nature.", url: absoluteUrl("/"), images: [{ url: absoluteUrl("/fairy-logo.png"), alt: "Chroma Fairy" }] },
  twitter: { card: "summary_large_image", title: "Fluid Abstract Artist Samantha Ty", description: "Fluid abstract paintings shaped by water, movement, and nature.", images: [absoluteUrl("/fairy-logo.png")] },
};

function getHomeSource() {
  const source = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf8");
  const styles = source.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
  const body = source.match(/<body>([\s\S]*?)<script>/)?.[1] ?? "";
  const markup = body
    .replaceAll('src="assets/', 'src="/assets/')
    .replace('      <a href="#contact">Contact</a>', '      <a href="#contact">Contact</a>\n      <a href="/shop">Shop</a>')
    .replace('<form onsubmit="event.preventDefault();this.reset();alert(\'Thank you — this is a prototype form. We will wire it to email before launch.\');">\n          <input type="text" placeholder="Your name" required />\n          <input type="email" placeholder="Email" required />\n          <textarea placeholder="Tell Samantha about your project…" required></textarea>\n          <button class="btn" type="submit">Send message</button>\n        </form>', '<div id="commission-form-mount"></div>')
    .replace('<div class="brand2">Samantha Ty</div>', '<div id="animated-fairy-mount"></div><div class="brand2">Samantha Ty</div>');

  return { styles, markup };
}

export default function HomePage() {
  return <HomeClient {...getHomeSource()} />;
}
