import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { blogDate, blogParagraphs, getBlogPost } from "../../../lib/blog";
import { absoluteUrl } from "../../../lib/site";
import "../blog.css";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const post = await getBlogPost(slug); return post ? { title: post.title, description: post.excerpt || undefined, alternates: { canonical: `/blog/${post.slug}` }, openGraph: { title: `${post.title} · Chroma Fairy`, description: post.excerpt || undefined, url: absoluteUrl(`/blog/${post.slug}`) } } : { title: "Journal entry" }; }

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const post = await getBlogPost(slug); if (!post) notFound(); return <main className="blog-shell"><div className="blog-frame"><header className="blog-header"><Link className="blog-back" href="/blog">← Journal</Link><Link aria-label="Chroma Fairy home" className="blog-brand" href="/"><img alt="Chroma Fairy" src="/fairy-logo-option-v2.png" /></Link></header><article className="blog-post"><div className="blog-meta">{blogDate(post.published_at)}</div><h1>{post.title}</h1>{post.excerpt ? <p className="blog-post-intro">{post.excerpt}</p> : null}<div className="blog-post-body">{blogParagraphs(post.body).map((paragraph, index) => <p key={`${post.id}-${index}`}>{paragraph}</p>)}</div><Link className="blog-post-back" href="/blog">← Back to the journal</Link></article><footer className="blog-footer">Chroma Fairy · Fluid abstract artist · Philippines</footer></div></main>; }
