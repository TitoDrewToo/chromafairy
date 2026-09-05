export type BlogTextBlock = { id: string; type: "text"; text: string };
export type BlogHeadingBlock = { id: string; type: "heading"; text: string };
export type BlogQuoteBlock = { id: string; type: "quote"; text: string };
export type BlogImageBlock = { id: string; type: "image"; path: string; alt: string; width: "full" | "half"; align: "left" | "right" };
export type BlogSplitBlock = { id: string; type: "split"; path: string; alt: string; align: "left" | "right"; text: string };
export type BlogBlock = BlogTextBlock | BlogHeadingBlock | BlogQuoteBlock | BlogImageBlock | BlogSplitBlock;
export type BlogContent = { version: 1; blocks: BlogBlock[] };

const MAX_BLOCKS = 80;
const MAX_TEXT = 50000;
const BLOG_PATH = /^blog\/[0-9a-f-]{36}\//i;

export function emptyBlogContent(): BlogContent { return { version: 1, blocks: [] }; }

export function normalizeBlogContent(value: unknown, postId?: string): BlogContent {
  const rawBlocks = value && typeof value === "object" && "blocks" in value && Array.isArray(value.blocks) ? value.blocks : [];
  let textLength = 0;
  const blocks = rawBlocks.slice(0, MAX_BLOCKS).flatMap((raw): BlogBlock[] => {
    if (!raw || typeof raw !== "object" || typeof raw.id !== "string" || typeof raw.type !== "string") return [];
    const id = raw.id.slice(0, 80);
    const text = typeof raw.text === "string" ? raw.text.slice(0, 10000) : "";
    if (["text", "heading", "quote"].includes(raw.type)) {
      textLength += text.length;
      return text ? [{ id, type: raw.type as BlogTextBlock["type"], text }] as BlogBlock[] : [];
    }
    if (raw.type === "image" && validBlogPath(raw.path, postId)) return [{ id, type: "image", path: raw.path, alt: clean(raw.alt, 240), width: raw.width === "half" ? "half" : "full", align: raw.align === "right" ? "right" : "left" }];
    if (raw.type === "split" && validBlogPath(raw.path, postId)) {
      textLength += text.length;
      return [{ id, type: "split", path: raw.path, alt: clean(raw.alt, 240), align: raw.align === "right" ? "right" : "left", text }];
    }
    return [];
  });
  if (textLength > MAX_TEXT) {
    let remaining = MAX_TEXT;
    return { version: 1, blocks: blocks.map((block) => {
      if (!("text" in block)) return block;
      const clipped = block.text.slice(0, Math.max(0, remaining));
      remaining -= clipped.length;
      return { ...block, text: clipped };
    }).filter((block) => !("text" in block) || block.text) };
  }
  return { version: 1, blocks };
}

export function blogContentText(content: BlogContent) { return content.blocks.filter((block): block is BlogTextBlock | BlogHeadingBlock | BlogQuoteBlock | BlogSplitBlock => "text" in block).map((block) => block.text).join("\n\n"); }
export function validBlogPath(value: unknown, postId?: string): value is string { return typeof value === "string" && BLOG_PATH.test(value) && (!postId || value.startsWith(`blog/${postId}/`)); }
function clean(value: unknown, max: number) { return String(value ?? "").trim().slice(0, max); }
