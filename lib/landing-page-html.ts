import type { LandingItem, LandingMedia } from "./supabase/types";
import type { LandingPageContent } from "./landing-page";
import { getArtworkSrcSet, getArtworkTransformUrl } from "./catalogue";

export function injectLandingMarkup(markup: string, content: LandingPageContent) {
  const sections = new Map(content.sections.map((section) => [section.section_key, section]));
  return markup
    .replace(/<section id="collections"[\s\S]*?<\/section>/, renderCollections(sections.get("collections")))
    .replace(/<section id="exhibitions"[\s\S]*?<\/section>/, renderExhibitions(sections.get("exhibitions")))
    .replace(/<section id="gallery"[\s\S]*?<\/section>/, renderGallery(sections.get("gallery")))
    .replace(/<section id="press"[\s\S]*?<\/section>[\s\S]*?<div id="adb-cover-modal"[\s\S]*?<\/div>\s*<div id="weigh-modal"[\s\S]*?<\/div>\s*<div id="xavier-modal"[\s\S]*?<\/div>/, renderPress(sections.get("press")));
}

function renderCollections(section?: LandingPageContent["sections"][number]) {
  if (!section) return "";
  const items = (section?.items ?? []).filter((item) => item.item_type === "collection").slice(0, 3);
  return `<section id="collections" class="stage light"><div class="head reveal"><div class="script">${text(section?.title || "Eternal Flow")}</div><div class="eyebrow">${text(section?.eyebrow || "Portfolio · Works")}</div>${paragraph(section?.body)}</div>${items.map((entry) => `<div class="wallrow reveal">${entry.media.slice(0, 3).map((image) => collectionPiece(image)).join("")}</div>`).join("")}</section>`;
}

function renderExhibitions(section?: LandingPageContent["sections"][number]) {
  if (!section) return "";
  const items = (section?.items ?? []).filter((item) => item.item_type === "exhibition").slice(0, 3);
  return `<section id="exhibitions" class="stage light"><div class="head reveal"><div class="eyebrow">${text(section?.eyebrow || "Exhibitions")}</div><h2>${text(section?.title || "On View")}</h2></div>${items.map((entry, index) => exhibitionEntry(entry, index)).join("")}</section>`;
}

function renderGallery(section?: LandingPageContent["sections"][number]) {
  if (!section) return "";
  const items = (section?.items ?? []).filter((item) => item.item_type === "gallery").slice(0, 3);
  const first = items[0];
  const rest = items.slice(1, 3);
  return `<section id="gallery" class="stage light"><div class="head reveal"><div class="script">${text(section?.title || "Other Works")}</div><div class="eyebrow">${text(section?.eyebrow || "Gallery · Seen in Situ")}</div>${paragraph(section?.body)}</div>${first ? `<div class="single reveal" style="margin-bottom:clamp(20px,3vh,36px)">${galleryRoom(first)}</div>` : ""}${rest.length ? `<div class="duo reveal">${rest.map(galleryRoom).join("")}</div>` : ""}</section>`;
}

function renderPress(section?: LandingPageContent["sections"][number]) {
  if (!section) return "";
  const entries = (section?.items ?? []).slice(0, 9);
  const imageEntries = entries.filter((entry) => entry.item_type === "press_image");
  const textEntries = entries.filter((entry) => entry.item_type === "press_text");
  const modals = imageEntries.map((entry) => pressModal(entry)).join("");
  return `<section id="press" class="airsec"><div class="wrap glass reveal"><div class="eyebrow">${text(section?.eyebrow || "Events & Features")}</div><h2>${text(section?.title || "In Print & On View")}</h2>${imageEntries.length ? `<div class="press-row">${imageEntries.map(pressImageCard).join("")}</div>` : ""}${textEntries.length ? `<div class="press-row press-row-text">${textEntries.map(pressTextCard).join("")}</div>` : ""}</div></section>${modals}`;
}

function collectionPiece(image: LandingMedia) {
  return `<div class="room spotlit" style="width:300px;height:400px"><div class="floorline"></div><div class="content"><div class="piece" style="width:264px"><div class="frame"><div class="mat"><img loading="lazy" ${imageAttrs(image.path, "(max-width: 760px) 80vw, 264px")} alt="${attr(image.alt)}" /></div></div><div class="plaque">${text(image.label)}</div></div></div></div>`;
}

function exhibitionEntry(entry: LandingItem, index: number) {
  const image = entry.media[0];
  const imageFirst = index % 2 === 0;
  const room = image ? `<div class="room has-photo"><img loading="lazy" class="photo" ${imageAttrs(image.path, "(max-width: 760px) 100vw, 50vw")} alt="${attr(image.alt)}" /><div class="scrim"></div><div class="roomcap">${text(image.label)}</div></div>` : `<div class="room" style="min-height:460px"><div class="scrim"></div></div>`;
  const copy = `<div class="showtext"><div class="k">${text(entry.eyebrow)}</div><h3>${text(entry.title)}</h3><div class="meta">${paragraphText(entry.subtitle)}</div>${entry.body ? `<p class="body" style="margin-top:16px">${paragraphText(entry.body)}</p>` : ""}</div>`;
  return `<div class="duo reveal" style="margin-bottom:clamp(24px,4vh,44px)">${imageFirst ? room + copy : copy + room}</div>`;
}

function galleryRoom(entry: LandingItem) {
  const image = entry.media[0];
  return `<div class="room${image ? " has-photo" : ""}"${image ? "" : " style=\"min-height:460px\""}>${image ? `<img loading="lazy" class="photo" ${imageAttrs(image.path, "(max-width: 760px) 100vw, 50vw")} alt="${attr(image.alt)}" />` : ""}<div class="scrim"></div><div class="roomcap">${text(image?.label || entry.title)}</div></div>`;
}

function pressImageCard(entry: LandingItem) {
  const image = entry.media[0];
  const modalId = `landing-press-${entry.id.replace(/[^a-z0-9_-]/gi, "-")}`;
  const socialClass = `press-social-art-${slug(entry.title)}`;
  const socialTile = `<span class="press-instagram-tile press-social-art ${attr(socialClass)}" aria-hidden="true"><span class="press-social-veil"></span><span class="press-social-dust press-social-dust-one"></span><span class="press-social-dust press-social-dust-two"></span><span class="press-social-dust press-social-dust-three"></span><span class="press-social-center"><strong>${text(entry.title)}</strong><span>${text(entry.eyebrow || "Social feature")}</span></span></span>`;
  return `<div class="quote adb-feature"><button class="press-cover-trigger" type="button" aria-haspopup="dialog" aria-controls="${attr(modalId)}">${image ? `<img loading="lazy" class="press-cover-image" ${imageAttrs(image.path, "(max-width: 760px) 80vw, 260px")} alt="${attr(image.alt)}" />` : socialTile}<span class="press-cover-caption">${text(image?.label || entry.link_label || "Open feature")}</span></button>${entry.body ? `<p>${linkText(entry.body, entry.link_url)}</p>` : ""}<div class="src">${text(entry.source)}</div></div>`;
}

function pressTextCard(entry: LandingItem) {
  return `<div class="quote"><p>${linkText(entry.body || entry.title, entry.link_url)}</p>${entry.source ? `<div class="src">${text(entry.source)}</div>` : ""}</div>`;
}

function pressModal(entry: LandingItem) {
  const image = entry.media[0];
  const modalId = `landing-press-${entry.id.replace(/[^a-z0-9_-]/gi, "-")}`;
  return `<div id="${attr(modalId)}" class="press-modal" role="dialog" aria-modal="true" aria-labelledby="${attr(modalId)}-title" hidden><figure class="press-modal-card ${image ? "" : "press-instagram-modal-card"}">${image ? `<img loading="lazy" ${imageAttrs(image.path, "(max-width: 760px) 90vw, 760px")} alt="${attr(image.alt)}" />` : ""}<div id="${attr(modalId)}-title" class="eyebrow">${text(entry.title)}</div></figure></div>`;
}

function imageAttrs(path: string, sizes: string) {
  const src = getArtworkTransformUrl(path, 768);
  const srcSet = getArtworkSrcSet(path);
  return `src="${attr(src)}"${srcSet ? ` srcset="${attr(srcSet)}" sizes="${attr(sizes)}"` : ""}`;
}

function linkText(value: string, url: string) {
  const content = paragraphText(value);
  return validLink(url) ? `<a href="${attr(url)}" target="_blank" rel="noopener noreferrer">${content}</a>` : content;
}
function validLink(value: string) { return /^(https?:\/\/|\/|#)/i.test(value); }
function paragraph(value?: string) { return value ? `<p class="body" style="margin:16px auto 0;text-align:center">${paragraphText(value)}</p>` : ""; }
function paragraphText(value: string) { return text(value).replace(/\n/g, "<br />"); }
function text(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
function attr(value: string) { return text(value); }
function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
