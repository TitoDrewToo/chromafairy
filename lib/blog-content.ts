export type BlogTextBlock = { id: string; type: "text"; text: string };
export type BlogHeadingBlock = { id: string; type: "heading"; text: string };
export type BlogQuoteBlock = { id: string; type: "quote"; text: string; companionText: string; source: string; width: "full" | "half"; align: "left" | "right" };
export type BlogImageBlock = { id: string; type: "image"; path: string; alt: string; companionText: string; width: "full" | "half"; align: "left" | "right" };
export type BlogSplitBlock = { id: string; type: "split"; path: string; alt: string; align: "left" | "right"; text: string };
export type BlogBlock = BlogTextBlock | BlogHeadingBlock | BlogQuoteBlock | BlogImageBlock | BlogSplitBlock;
export type BlogContent = { version: 1; blocks: BlogBlock[] };

const MAX_BLOCKS = 80;
const MAX_TEXT = 50000;
const BLOG_PATH = /^blog\/[0-9a-f-]{36}\//i;

export function emptyBlogContent(): BlogContent { return { version: 1, blocks: [] }; }

export function normalizeBlogContent(value: unknown, postId?: string, preserveEmpty = false): BlogContent {
  const rawBlocks = value && typeof value === "object" && "blocks" in value && Array.isArray(value.blocks) ? value.blocks : [];
  let textLength = 0;
  const blocks = rawBlocks.slice(0, MAX_BLOCKS).flatMap((raw): BlogBlock[] => {
    if (!raw || typeof raw !== "object" || typeof raw.id !== "string" || typeof raw.type !== "string") return [];
    const id = raw.id.slice(0, 80);
    const text = typeof raw.text === "string" ? raw.text.slice(0, 10000) : "";
    if (["text", "heading", "quote"].includes(raw.type)) {
      textLength += text.length;
      if (!text && !preserveEmpty) return [];
      if (raw.type === "quote") {
        const companionText = clean(raw.companionText, 10000);
        textLength += companionText.length;
        return [{ id, type: "quote", text, companionText, source: clean(raw.source, 240), width: raw.width === "half" ? "half" : "full", align: raw.align === "right" ? "right" : "left" }];
      }
      return [{ id, type: raw.type as BlogTextBlock["type"], text }] as BlogBlock[];
    }
    if (raw.type === "image" && (validBlogPath(raw.path, postId) || preserveEmpty)) {
      const companionText = clean(raw.companionText, 10000);
      textLength += companionText.length;
      return [{ id, type: "image", path: validBlogPath(raw.path, postId) ? raw.path : "", alt: clean(raw.alt, 240), companionText, width: raw.width === "half" ? "half" : "full", align: raw.align === "right" ? "right" : "left" }];
    }
    if (raw.type === "split" && (validBlogPath(raw.path, postId) || preserveEmpty)) {
      textLength += text.length;
      return [{ id, type: "split", path: validBlogPath(raw.path, postId) ? raw.path : "", alt: clean(raw.alt, 240), align: raw.align === "right" ? "right" : "left", text }];
    }
    return [];
  });
  if (textLength > MAX_TEXT) {
    let remaining = MAX_TEXT;
    return { version: 1, blocks: blocks.map((block) => {
      if ("text" in block) {
        const clipped = block.text.slice(0, Math.max(0, remaining));
        remaining -= clipped.length;
        return { ...block, text: clipped };
      }
      if ("companionText" in block) {
        const clipped = block.companionText.slice(0, Math.max(0, remaining));
        remaining -= clipped.length;
        return { ...block, companionText: clipped };
      }
      return block;
    }).filter((block) => !("text" in block) || block.text) };
  }
  return { version: 1, blocks };
}

export function blogContentText(content: BlogContent) {
  return content.blocks.flatMap((block) => {
    if (block.type === "text" || block.type === "heading" || block.type === "split") return [block.text];
    if (block.type === "quote") return [block.companionText, block.source].filter(Boolean);
    if (block.type === "image") return [block.companionText].filter(Boolean);
    return [];
  }).join("\n\n");
}
export function validBlogPath(value: unknown, postId?: string): value is string { return typeof value === "string" && BLOG_PATH.test(value) && (!postId || value.startsWith(`blog/${postId}/`)); }
function clean(value: unknown, max: number) { return String(value ?? "").trim().slice(0, max); }
