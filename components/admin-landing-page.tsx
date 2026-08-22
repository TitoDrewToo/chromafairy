"use client";

import { useState } from "react";
import { deleteLandingItem, reorderLandingItems, updateLandingSection, uploadLandingImage, upsertLandingItem } from "../app/actions/admin-landing-page";
import { prepareArtworkFile } from "../lib/client-image-conversion";
import { getArtworkUrl } from "../lib/catalogue";
import { createClient } from "../lib/supabase/client";
import type { LandingPageContent } from "../lib/landing-page";
import type { LandingItem, LandingItemType, LandingMedia, LandingSectionKey } from "../lib/supabase/types";

const sectionLabels: Record<LandingSectionKey, string> = { collections: "Collections", exhibitions: "Exhibitions", press: "Press", gallery: "Gallery" };
const limits: Record<LandingSectionKey, number> = { collections: 3, exhibitions: 3, press: 9, gallery: 3 };

export default function AdminLandingPage({ initialContent }: { initialContent: LandingPageContent }) {
  const [sections, setSections] = useState(initialContent.sections);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateSection(sectionId: string, patch: Partial<typeof sections[number]>) { setSections((current) => current.map((section) => section.id === sectionId ? { ...section, ...patch } : section)); }
  function updateItem(sectionId: string, itemId: string, patch: Partial<LandingItem>) { setSections((current) => current.map((section) => section.id === sectionId ? { ...section, items: section.items.map((item) => item.id === itemId ? { ...item, ...patch } : item) } : section)); }

  async function saveSection(section: typeof sections[number]) {
    setBusy(`section-${section.id}`); clearStatus();
    const result = await updateLandingSection({ sectionId: section.id, sectionKey: section.section_key, eyebrow: section.eyebrow, title: section.title, body: section.body, isPublished: section.is_published });
    setBusy(""); result.ok ? setMessage(`${sectionLabels[section.section_key]} copy saved.`) : setError(result.error ?? "Could not save that section.");
  }

  async function saveItem(section: typeof sections[number], entry: LandingItem) {
    setBusy(`item-${entry.id}`); clearStatus();
    const result = await upsertLandingItem({ id: entry.id, sectionId: section.id, sectionKey: section.section_key, itemType: entry.item_type, eyebrow: entry.eyebrow, title: entry.title, subtitle: entry.subtitle, body: entry.body, source: entry.source, linkUrl: entry.link_url, linkLabel: entry.link_label, media: entry.media, displayOrder: entry.display_order, isPublished: entry.is_published });
    setBusy("");
    if (result.ok) {
      updateItem(section.id, entry.id, { created_at: result.createdAt ?? (entry.created_at || new Date().toISOString()) });
      setMessage(`${entry.title || "Entry"} saved.`);
    } else setError(result.error ?? "Could not save that entry.");
  }

  function addItem(section: typeof sections[number]) {
    if (section.items.length >= limits[section.section_key]) return setError(`${sectionLabels[section.section_key]} is limited to ${limits[section.section_key]} entries.`);
    const itemType: LandingItemType = section.section_key === "collections" ? "collection" : section.section_key === "exhibitions" ? "exhibition" : section.section_key === "gallery" ? "gallery" : "press_text";
    const mediaCount = section.section_key === "collections" ? 3 : section.section_key === "gallery" ? 1 : 1;
    const media = Array.from({ length: mediaCount }, () => ({ path: "", alt: "", label: "" }));
    const entry: LandingItem = { id: crypto.randomUUID(), section_id: section.id, item_type: itemType, eyebrow: "", title: "New entry", subtitle: "", body: "", source: "", link_url: "", link_label: "", media, display_order: section.items.length, is_published: true, created_at: "", updated_at: "" };
    setSections((current) => current.map((currentSection) => currentSection.id === section.id ? { ...currentSection, items: [...currentSection.items, entry] } : currentSection));
    clearStatus(); setMessage("New entry added. Add its image or copy, then save it.");
  }

  async function removeItem(section: typeof sections[number], entry: LandingItem) {
    if (!window.confirm(`Remove “${entry.title || "this entry"}”?`)) return;
    if (!entry.created_at) { setSections((current) => current.map((item) => item.id === section.id ? { ...item, items: item.items.filter((candidate) => candidate.id !== entry.id) } : item)); return; }
    setBusy(`item-${entry.id}`); clearStatus();
    const result = await deleteLandingItem(entry.id);
    if (result.ok) { setSections((current) => current.map((item) => item.id === section.id ? { ...item, items: item.items.filter((candidate) => candidate.id !== entry.id) } : item)); setMessage("Entry removed."); } else setError(result.error ?? "Could not remove that entry.");
    setBusy("");
  }

  async function moveItem(section: typeof sections[number], index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= section.items.length) return;
    if (section.items.some((item) => !item.created_at)) {
      setError("Save new entries before reordering this section.");
      return;
    }
    const items = [...section.items]; [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
    const ordered = items.map((item, order) => ({ ...item, display_order: order }));
    setSections((current) => current.map((item) => item.id === section.id ? { ...item, items: ordered } : item));
    setBusy(`order-${section.id}`); clearStatus();
    const result = await reorderLandingItems(section.id, ordered.map((item) => item.id));
    setBusy(""); result.ok ? setMessage(`${sectionLabels[section.section_key]} order saved.`) : setError(result.error ?? "Could not reorder that section.");
  }

  async function replaceImage(section: typeof sections[number], entry: LandingItem, index: number, file: File) {
    setBusy(`image-${entry.id}-${index}`); clearStatus();
    try {
      const prepared = await prepareArtworkFile(file);
      const result = await uploadLandingImage({ sectionKey: section.section_key, file: prepared });
      if (!result.ok) return setError(result.error ?? "Could not upload that image.");
      if (!result.path) return setError("The image uploaded without a storage path.");
      const client = createClient();
      const nextMedia = [...entry.media]; nextMedia[index] = { ...nextMedia[index], path: client ? getArtworkUrl(client, result.path) : result.path };
      updateItem(section.id, entry.id, { media: nextMedia });
      setMessage("Image uploaded. Save the entry to publish it.");
    } catch (uploadError) {
      console.error("[landing-editor] image upload failed", uploadError);
      setError("That image could not be converted or uploaded.");
    } finally { setBusy(""); }
  }

  function clearStatus() { setMessage(""); setError(""); }

  return <section className="admin-landing-editor">
    <div className="admin-landing-notice"><strong>Template-protected editing</strong><span>Collections, Exhibitions, and Press can grow within safe limits. Gallery stays at three image slots. Images use fixed frames so the public page flow remains stable.</span></div>
    {message && <p className="admin-inline-success" role="status">{message}</p>}{error && <p className="admin-error" role="alert">{error}</p>}
    {sections.map((section) => <section className="admin-landing-section" key={section.id}>
      <div className="admin-landing-section-heading"><div><p className="admin-eyebrow">{sectionLabels[section.section_key]}</p><h2>{section.title || sectionLabels[section.section_key]}</h2><p className="admin-muted">{section.items.length} / {limits[section.section_key]} slots used</p></div><label className="admin-landing-publish"><input checked={section.is_published} onChange={(event) => updateSection(section.id, { is_published: event.target.checked })} type="checkbox" /> Published</label></div>
      <div className="admin-landing-copy"><label>Eyebrow<input value={section.eyebrow} onChange={(event) => updateSection(section.id, { eyebrow: event.target.value })} /></label><label>Title<input value={section.title} onChange={(event) => updateSection(section.id, { title: event.target.value })} /></label><label className="field-wide">Description<textarea rows={3} value={section.body} onChange={(event) => updateSection(section.id, { body: event.target.value })} /></label></div>
      <button className="admin-action-button" disabled={busy === `section-${section.id}`} onClick={() => void saveSection(section)} type="button">{busy === `section-${section.id}` ? "Saving…" : `Save ${sectionLabels[section.section_key]} copy`}</button>
      <div className="admin-landing-items">{section.items.map((entry, index) => <LandingItemEditor busy={busy} entry={entry} index={index} key={entry.id} section={section} onChange={(patch) => updateItem(section.id, entry.id, patch)} onImage={(imageIndex, file) => void replaceImage(section, entry, imageIndex, file)} onMove={(direction) => void moveItem(section, index, direction)} onRemove={() => void removeItem(section, entry)} onSave={() => void saveItem(section, entry)} />)}</div>
      {section.section_key !== "gallery" && <button className="admin-secondary-button admin-landing-add" disabled={section.items.length >= limits[section.section_key] || Boolean(busy)} onClick={() => addItem(section)} type="button">+ Add {section.section_key === "collections" ? "series" : section.section_key === "press" ? "press entry" : "exhibition"}</button>}
    </section>)}
  </section>;
}

function LandingItemEditor({ section, entry, index, busy, onChange, onImage, onMove, onRemove, onSave }: { section: LandingPageContent["sections"][number]; entry: LandingItem; index: number; busy: string; onChange: (patch: Partial<LandingItem>) => void; onImage: (index: number, file: File) => void; onMove: (direction: -1 | 1) => void; onRemove: () => void; onSave: () => void }) {
  const imageSlots = section.section_key === "collections" ? 3 : 1;
  return <article className="admin-landing-item">
    <div className="admin-landing-item-heading"><strong>{index + 1}. {entry.title || "Untitled entry"}</strong><div className="admin-landing-item-actions"><button className="admin-small-button" disabled={index === 0 || Boolean(busy) || !entry.created_at || section.items.some((item) => !item.created_at)} onClick={() => onMove(-1)} title={!entry.created_at ? "Save this entry before reordering" : undefined} type="button">↑</button><button className="admin-small-button" disabled={index === section.items.length - 1 || Boolean(busy) || !entry.created_at || section.items.some((item) => !item.created_at)} onClick={() => onMove(1)} title={!entry.created_at ? "Save this entry before reordering" : undefined} type="button">↓</button>{section.section_key !== "gallery" && <button className="admin-small-button admin-danger-button" disabled={Boolean(busy)} onClick={onRemove} type="button">Remove</button>}</div></div>
    {section.section_key === "press" && <label>Entry format<select value={entry.item_type} onChange={(event) => onChange({ item_type: event.target.value as LandingItemType, media: event.target.value === "press_text" ? [] : entry.media })}><option value="press_image">Image feature</option><option value="press_text">Text / link</option></select></label>}
    <div className="admin-landing-item-fields"><label>Eyebrow<input value={entry.eyebrow} onChange={(event) => onChange({ eyebrow: event.target.value })} /></label><label>Title<input value={entry.title} onChange={(event) => onChange({ title: event.target.value })} /></label><label>Subtitle / metadata<textarea rows={2} value={entry.subtitle} onChange={(event) => onChange({ subtitle: event.target.value })} /></label><label>Copy<textarea rows={3} value={entry.body} onChange={(event) => onChange({ body: event.target.value })} /></label><label>Source<input value={entry.source} onChange={(event) => onChange({ source: event.target.value })} /></label><label>Link URL<input value={entry.link_url} onChange={(event) => onChange({ link_url: event.target.value })} /></label><label>Link label<input value={entry.link_label} onChange={(event) => onChange({ link_label: event.target.value })} /></label><label className="admin-landing-publish"><input checked={entry.is_published} onChange={(event) => onChange({ is_published: event.target.checked })} type="checkbox" /> Published</label></div>
    {entry.item_type !== "press_text" && <div className="admin-landing-media-grid">{Array.from({ length: imageSlots }, (_, mediaIndex) => <LandingMediaEditor entry={entry} index={mediaIndex} key={mediaIndex} busy={busy} onChange={onChange} onImage={onImage} />)}</div>}
    <button className="admin-action-button" disabled={Boolean(busy)} onClick={onSave} type="button">{busy === `item-${entry.id}` ? "Saving…" : "Save entry"}</button>
  </article>;
}

function LandingMediaEditor({ entry, index, busy, onChange, onImage }: { entry: LandingItem; index: number; busy: string; onChange: (patch: Partial<LandingItem>) => void; onImage: (index: number, file: File) => void }) {
  const media = entry.media[index] ?? { path: "", alt: "", label: "" };
  const client = createClient();
  return <div className="admin-landing-media"><div className="admin-landing-media-preview">{media.path ? <img alt={media.alt || "Landing image"} src={media.path.startsWith("/") || /^https?:\/\//i.test(media.path) ? media.path : client ? getArtworkUrl(client, media.path) : media.path} /> : <span>No image</span>}</div><label>Image<input accept=".jpg,.jpeg,.png,.webp,.gif,.heic,.heif,image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif" disabled={Boolean(busy)} onChange={(event) => { const file = event.target.files?.[0]; if (file) onImage(index, file); event.currentTarget.value = ""; }} type="file" /></label><label>Image label<input value={media.label} onChange={(event) => { const next = [...entry.media]; next[index] = { ...media, label: event.target.value }; onChange({ media: next }); }} /></label><label>Alt text<input value={media.alt} onChange={(event) => { const next = [...entry.media]; next[index] = { ...media, alt: event.target.value }; onChange({ media: next }); }} /></label></div>;
}
