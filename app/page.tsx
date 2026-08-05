import fs from "node:fs";
import path from "node:path";
import HomeClient from "../components/home-client";

function getHomeSource() {
  const source = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf8");
  const styles = source.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
  const body = source.match(/<body>([\s\S]*?)<script>/)?.[1] ?? "";
  const markup = body
    .replaceAll('src="assets/', 'src="/assets/')
    .replace('      <a href="#contact">Contact</a>', '      <a href="#contact">Contact</a>\n      <a href="/shop">Shop</a>');

  return { styles, markup };
}

export default function HomePage() {
  return <HomeClient {...getHomeSource()} />;
}
