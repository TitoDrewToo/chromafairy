import Link from "next/link";
import type { Metadata } from "next";
import { blogDate, blogExcerpt, blogYear, getBlogPosts } from "../../lib/blog";
import { absoluteUrl } from "../../lib/site";
import "./blog.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notes from the studio", description: "Notes, observations, and works in progress from Samantha Ty.", alternates: { canonical: "/blog" }, openGraph: { title: "Notes from the studio · Chroma Fairy", description: "Notes, observations, and works in progress from Samantha Ty.", url: absoluteUrl("/blog") } };

export default async function BlogPage() {
  const posts = await getBlogPosts();
  const featured = posts[0];
  const archive = posts.slice(1);
  const years = Array.from(new Set(archive.map(blogYear)));
  return <main className="blog-shell"><div className="blog-frame"><header className="blog-header"><Link className="blog-back" href="/">← Back home</Link><Link aria-label="Chroma Fairy home" className="blog-brand" href="/"><img alt="Chroma Fairy" src="/fairy-logo-option-v2.png" /></Link></header><section className="blog-intro"><h1 className="blog-title">Notes from the studio</h1></section>{featured ? <section className="blog-feature"><div><div className="blog-meta">Latest · {blogDate(featured.published_at)}</div><h2>{featured.title}</h2><p>{blogExcerpt(featured)}</p><Link className="blog-read-link" href={`/blog/${featured.slug}`}>Read entry →</Link></div></section> : <p className="blog-empty">New entries will appear here as they arrive.</p>}<section className="blog-archive"><div className="blog-archive-heading"><h2>Entries</h2><span>{posts.length} entr{posts.length === 1 ? "y" : "ies"}</span></div>{years.length ? years.map((year) => <section className="blog-year" key={year}><h3>{year}</h3><div className="blog-entry-list">{archive.filter((post) => blogYear(post) === year).map((post) => <article className="blog-entry" key={post.id}><div><h4><Link href={`/blog/${post.slug}`}>{post.title}</Link></h4><p>{blogExcerpt(post)}</p></div><time dateTime={post.published_at ?? post.created_at}>{blogDate(post.published_at)}</time></article>)}</div></section>) : null}</section><footer className="blog-footer">Chroma Fairy · Fluid abstract artist · Philippines</footer></div></main>;
}
