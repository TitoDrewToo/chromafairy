import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LandingItem, LandingItemType, LandingMedia, LandingSection, LandingSectionKey } from "./supabase/types";
import { getArtworkUrl } from "./catalogue";
import { createClient } from "./supabase/server";

export type LandingPageContent = { sections: Array<LandingSection & { items: LandingItem[] }> };

const sectionDefaults: Record<LandingSectionKey, Omit<LandingSection, "id" | "created_at" | "updated_at">> = {
  collections: { section_key: "collections", eyebrow: "Portfolio · Works", title: "Eternal Flow", body: "The artist's reverence for water shows in her series entitled \"Eternal Flow.\" Water has always been the universal symbol for life. By creating water-themed paintings, she captures vitality and life itself, and aims to bring this energy out into the world — one painting at a time.", is_published: true },
  exhibitions: { section_key: "exhibitions", eyebrow: "Exhibitions", title: "On View", body: "", is_published: true },
  gallery: { section_key: "gallery", eyebrow: "Gallery · Seen in Situ", title: "Other Works", body: "Her pieces, in the spaces they now call home.", is_published: true },
  press: { section_key: "press", eyebrow: "Events & Features", title: "In Print & On View", body: "", is_published: true },
};

const media = (path: string, alt: string, label: string): LandingMedia => ({ path, alt, label });
const item = (id: string, section_id: string, item_type: LandingItemType, title: string, options: Partial<LandingItem> = {}): LandingItem => ({
  id, section_id, item_type, eyebrow: "", title, subtitle: "", body: "", source: "", link_url: "", link_label: "", media: [], display_order: 0, is_published: true, created_at: "", updated_at: "", ...options,
});

export function defaultLandingPage(): LandingPageContent {
  const ids = { collections: "default-collections", exhibitions: "default-exhibitions", gallery: "default-gallery", press: "default-press" };
  return { sections: [
    { id: ids.collections, ...sectionDefaults.collections, created_at: "", updated_at: "", items: [item("default-collection-flow", ids.collections, "collection", "Eternal Flow", { media: [media("/assets/sel-flowL.jpg", "Eternal Flow", "Eternal Flow I"), media("/assets/sel-flowC.jpg", "Eternal Flow", "Eternal Flow II"), media("/assets/sel-flowR.jpg", "Eternal Flow", "Eternal Flow III")] })] },
    { id: ids.exhibitions, ...sectionDefaults.exhibitions, created_at: "", updated_at: "", items: [
      item("default-exhibit-waves", ids.exhibitions, "exhibition", "Waves of Being", { eyebrow: "Solo Exhibit", subtitle: "Charlie's Art Gallery @ Galeria Lienzo\nItalia Restaurant · Bacolod City · June 15, 2025", body: "Her solo exhibit — a body of ocean-drawn work, deep teals and marbled whites, presented together.", media: [media("/assets/sel-exhibitA.jpg", "Waves of Being — gallery installation", "Galeria Lienzo · Bacolod City")] }),
      item("default-exhibit-siargao", ids.exhibitions, "exhibition", "Siargao", { eyebrow: "Installation", subtitle: "Open-air panels · among the palms", body: "Fluid panels set against tropical light — the paintings meeting the sea and sky that inspired them.", media: [media("/assets/sel-siargao.jpg", "Open-air installation, Siargao", "Open-air · Siargao")] }),
    ] },
    { id: ids.gallery, ...sectionDefaults.gallery, created_at: "", updated_at: "", items: [
      item("default-gallery-grey", ids.gallery, "gallery", "In a Living Room", { media: [media("/assets/sel-roomGrey.jpg", "Eternal Flow in a living room", "In a Living Room")] }),
      item("default-gallery-baby", ids.gallery, "gallery", "A Commission at Home", { media: [media("/assets/sel-roomBaby.jpg", "A commissioned piece at home", "A Commission at Home")] }),
      item("default-gallery-red", ids.gallery, "gallery", "In a Lounge", { media: [media("/assets/sel-roomRed.jpg", "A piece in a lounge", "In a Lounge")] }),
    ] },
    { id: ids.press, ...sectionDefaults.press, created_at: "", updated_at: "", items: [
      item("default-press-adb", ids.press, "press_image", "Asian Development Outlook 2024", { body: "Cover artwork for the Asian Development Outlook 2024.", source: "Asian Development Bank", media: [media("/assets/adb-outlook-cover.jpeg", "Asian Development Outlook April 2024 featuring Samantha Ty's artwork", "Open cover artwork")], link_url: "https://www.linkedin.com/pulse/adb-raises-developing-asia-pacifics-economic-growth-vdj5c/", link_label: "Open feature" }),
      item("default-press-xavier", ids.press, "press_image", "Xavier Artfest", { eyebrow: "2024 · Group exhibition", body: "Exhibited at Xavier Artfest 2024.", source: "Group Exhibition", link_url: "https://www.instagram.com/xsartfest/", link_label: "Open Instagram profile" }),
      item("default-press-weigh", ids.press, "press_image", "The Weigh+", { eyebrow: "Featured artist", body: "Featured artist, The Weigh+.", source: "Jan–March 2024", link_url: "https://www.instagram.com/p/C2UME2Voc8K/", link_label: "Open Instagram feature" }),
      item("default-press-linkedin", ids.press, "press_text", "ADB · Feature", { body: "Featured in the Asian Development Bank's LinkedIn newsletter.", link_url: "https://www.linkedin.com/pulse/adb-raises-developing-asia-pacifics-economic-growth-vdj5c/", link_label: "Read the feature" }),
      item("default-press-finest", ids.press, "press_text", "Exhibition", { body: "\"Philippine's Finest\" at the House of Representatives.", source: "Exhibition" }),
      item("default-press-waves", ids.press, "press_text", "Bacolod City · 2025", { body: "Waves of Being — solo exhibit, Charlie's Art Gallery.", link_url: "https://charliesartgallery.com/exhibit/waves-of-being-samantha-ty/", link_label: "View the exhibit" }),
    ] },
  ] };
}

export async function getLandingPageContent(options: { publishedOnly?: boolean } = {}): Promise<LandingPageContent> {
  const fallback = defaultLandingPage();
  const supabase = await createClient();
  if (!supabase) return fallback;
  const publishedOnly = options.publishedOnly ?? true;
  const sectionQuery = supabase.from("landing_sections").select("*").order("section_key");
  const itemQuery = supabase.from("landing_items").select("*").order("display_order").order("created_at");
  const [{ data: sections, error: sectionError }, { data: items, error: itemError }] = await Promise.all([sectionQuery, itemQuery]);
  if (sectionError || itemError || !sections || (publishedOnly ? sections.length === 0 : sections.length !== 4)) return fallback;
  const visibleSections = (sections as LandingSection[]).filter((section) => !publishedOnly || section.is_published);
  const visibleSectionIds = new Set(visibleSections.map((section) => section.id));
  const itemsBySection = new Map<string, LandingItem[]>();
  (items as LandingItem[]).forEach((entry) => {
    if (!visibleSectionIds.has(entry.section_id) || (publishedOnly && !entry.is_published)) return;
    itemsBySection.set(entry.section_id, [...(itemsBySection.get(entry.section_id) ?? []), normalizeItem(entry, supabase)]);
  });
  const result = visibleSections.map((section) => ({ ...section, items: itemsBySection.get(section.id) ?? [] }));
  return { sections: result };
}

export function resolveLandingMedia(supabase: SupabaseClient<Database> | null, value: LandingMedia): LandingMedia {
  if (!supabase || value.path.startsWith("/" ) || /^https?:\/\//i.test(value.path)) return value;
  return { ...value, path: getArtworkUrl(supabase, value.path) };
}

function normalizeItem(entry: LandingItem, supabase: SupabaseClient<Database>): LandingItem {
  const values = Array.isArray(entry.media) ? entry.media.filter((value): value is LandingMedia => Boolean(value && typeof value.path === "string" && typeof value.alt === "string" && typeof value.label === "string")) : [];
  return { ...entry, media: values.map((value) => resolveLandingMedia(supabase, value)) };
}
