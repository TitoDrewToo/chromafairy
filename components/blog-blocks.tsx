import type { BlogBlock, BlogContent } from "../lib/blog-content";

const imageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/artwork/`;
export function blogImageUrl(path: string) { return /^https?:\/\//i.test(path) ? path : `${imageBase}${path}`; }

export default function BlogBlocks({ content, fallbackBody, preview = false }: { content?: BlogContent | null; fallbackBody?: string; preview?: boolean }) {
  const blocks = content?.blocks?.length ? content.blocks : fallbackBody ? [{ id: "legacy-body", type: "text" as const, text: fallbackBody }] : [];
  return <div className={`blog-blocks${preview ? " is-preview" : ""}`}>{blocks.map((block) => <BlogBlockView block={block} key={block.id} />)}</div>;
}

function BlogBlockView({ block }: { block: BlogBlock }) {
  if (block.type === "heading") return <h2 className="blog-block-heading">{inlineText(block.text)}</h2>;
  if (block.type === "quote") return <div className={`blog-block-quote-layout is-${block.width} align-${block.align}${block.companionText || block.source ? " has-companion" : ""}`}><blockquote className="blog-block-quote">{inlineText(block.text)}</blockquote>{block.companionText || block.source ? <aside className="blog-block-companion">{block.companionText ? paragraphs(block.companionText) : null}{block.source ? <cite>— {inlineText(block.source)}</cite> : null}</aside> : null}</div>;
  if (block.type === "image") return <div className={`blog-block-image-layout is-${block.width} align-${block.align}${block.companionText ? " has-companion" : ""}`}><figure className="blog-block-image">{block.path ? <img src={blogImageUrl(block.path)} alt={block.alt} loading="lazy" /> : <div className="blog-block-image-empty">Choose a photo to see it in the preview.</div>}</figure>{block.companionText ? <aside className="blog-block-companion">{paragraphs(block.companionText)}</aside> : null}</div>;
  if (block.type === "split") return <div className={`blog-block-split align-${block.align}`}><figure className="blog-block-image is-half">{block.path ? <img src={blogImageUrl(block.path)} alt={block.alt} loading="lazy" /> : <div className="blog-block-image-empty">Choose a photo to see it in the preview.</div>}</figure><div className="blog-block-split-text">{paragraphs(block.text)}</div></div>;
  return <div className="blog-block-paragraph">{paragraphs(block.text)}</div>;
}

function paragraphs(text: string) { return text.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{inlineText(paragraph)}</p>); }
function inlineText(text: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|==[^=]+==|\*[^*]+\*)/g).filter(Boolean);
  return tokens.map((token, index) => token.startsWith("**") && token.endsWith("**") ? <strong key={index}>{token.slice(2, -2)}</strong> : token.startsWith("==") && token.endsWith("==") ? <mark key={index}>{token.slice(2, -2)}</mark> : token.startsWith("*") && token.endsWith("*") ? <em key={index}>{token.slice(1, -1)}</em> : <span key={index}>{token}</span>);
}
