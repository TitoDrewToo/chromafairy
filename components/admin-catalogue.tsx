"use client";

import Link from "next/link";
import { ChangeEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice, getArtworkUrl } from "../lib/catalogue";
import { createClient } from "../lib/supabase/client";
import type { Series, Work, WorkImage, WorkStatus } from "../lib/supabase/types";
import { Hint } from "./studio-hint";
import { deleteCatalogueWork } from "../app/actions/admin-catalogue";

export type AdminCatalogueImage = Pick<WorkImage, "id" | "work_id" | "storage_path" | "alt" | "display_order" | "is_primary"> & { url: string };
export type AdminCatalogueSeries = Pick<Series, "id" | "name" | "slug" | "year">;
export type AdminCatalogueWork = Work & { series_name: string | null; images: AdminCatalogueImage[] };

const statuses: Array<WorkStatus | "all"> = ["all", "draft", "available", "reserved", "sold"];
type TriState = "" | "true" | "false";
type BatchDetails = { year: string; month: string; medium: string; description: string; pricePhp: string; priceUsd: string; priceOnRequest: TriState; isNew: TriState; isFeatured: TriState };
type InlineEdit = { title: string; pricePhp: string; priceUsd: string };
const emptyBatchDetails: BatchDetails = { year: "", month: "", medium: "", description: "", pricePhp: "", priceUsd: "", priceOnRequest: "", isNew: "", isFeatured: "" };

export default function CatalogueAdmin({ initialWorks, initialSeries }: { initialWorks: AdminCatalogueWork[]; initialSeries: AdminCatalogueSeries[] }) {
  const router = useRouter();
  const quickAddRef = useRef<HTMLInputElement>(null);
  const [works, setWorks] = useState(initialWorks);
  const [statusFilter, setStatusFilter] = useState<WorkStatus | "all">("all");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchStatus, setBatchStatus] = useState<WorkStatus | "">("");
  const [batchSeries, setBatchSeries] = useState<string>("");
  const [batchNewSeriesName, setBatchNewSeriesName] = useState("");
  const [batchDetails, setBatchDetails] = useState<BatchDetails>(emptyBatchDetails);
  const [inlineEdits, setInlineEdits] = useState<Record<string, InlineEdit>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filteredWorks = useMemo(() => works
    .filter((work) => {
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return [work.title, work.slug, work.series_name ?? "", work.medium ?? "", String(work.year)].some((value) => value.toLowerCase().includes(query));
    })
    .filter((work) => statusFilter === "all" || work.status === statusFilter)
    .filter((work) => seriesFilter === "all" || work.series_id === seriesFilter)
    .sort((a, b) => b.year - a.year || (b.month ?? 0) - (a.month ?? 0) || (b.created_at ?? "").localeCompare(a.created_at ?? "")), [works, search, statusFilter, seriesFilter]);

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) => {
      const next = new Set(current);
      const allSelected = filteredWorks.length > 0 && filteredWorks.every((work) => next.has(work.id));
      filteredWorks.forEach((work) => allSelected ? next.delete(work.id) : next.add(work.id));
      return next;
    });
  }

  async function setStatus(id: string, status: WorkStatus) {
    const supabase = createClient();
    if (!supabase) return setError("Supabase is not configured.");
    setError("");
    const { error: updateError } = await supabase.from("works").update({ status }).eq("id", id);
    if (updateError) return setError("Could not update that work.");
    setWorks((current) => current.map((work) => work.id === id ? { ...work, status } : work));
  }

  async function applyBatch() {
    if (!selected.size || (!batchStatus && !batchSeries && !batchNewSeriesName.trim() && !hasBatchDetails(batchDetails))) return;
    const supabase = createClient();
    if (!supabase) return setError("Supabase is not configured.");
    setBusy(true); setError(""); setMessage("");
    let seriesForBatch = batchSeries;
    if (batchNewSeriesName.trim()) {
      const newSeriesId = crypto.randomUUID();
      const newSeriesSlug = `${slugify(batchNewSeriesName) || "series"}-${newSeriesId.slice(0, 8)}`;
      const { error: seriesError } = await supabase.from("series").insert({ id: newSeriesId, name: batchNewSeriesName.trim(), slug: newSeriesSlug, year: batchDetails.year ? Number(batchDetails.year) : new Date().getFullYear() });
      if (seriesError) { setBusy(false); return setError("Could not create that series. Check its name and try again."); }
      seriesForBatch = newSeriesId;
    }
    const payloadForBatch = createBatchPayload(batchStatus, seriesForBatch, batchDetails);
    const updates = Array.from(selected).map((id) => {
      return supabase.from("works").update(payloadForBatch).eq("id", id);
    });
    const results = await Promise.all(updates);
    const failed = results.find((result) => result.error);
    if (failed?.error) setError("Some works could not be updated.");
    else {
      setWorks((current) => current.map((work) => selected.has(work.id) ? {
        ...work,
        ...payloadForBatch,
        status: batchStatus || work.status,
        series_id: seriesForBatch ? seriesForBatch === "__none__" ? null : seriesForBatch : work.series_id,
        series_name: seriesForBatch ? seriesForBatch === "__none__" ? null : (batchNewSeriesName.trim() || initialSeries.find((item) => item.id === seriesForBatch)?.name || null) : work.series_name,
      } : work));
      setMessage(`${selected.size} work${selected.size === 1 ? "" : "s"} updated.`);
      setSelected(new Set()); setBatchStatus(""); setBatchSeries(""); setBatchNewSeriesName(""); setBatchDetails(emptyBatchDetails);
    }
    setBusy(false);
  }

  async function saveInlineEdits() {
    const selectedWorks = works.filter((work) => selected.has(work.id));
    const changed = selectedWorks.map((work) => {
      const edit = inlineEdits[work.id] ?? inlineEditFor(work);
      const payload: Partial<Pick<Work, "title" | "price_php" | "price_usd">> = {};
      if (edit.title.trim() && edit.title.trim() !== work.title) payload.title = edit.title.trim();
      if (edit.pricePhp !== numberString(work.price_php)) payload.price_php = edit.pricePhp.trim() ? Number(edit.pricePhp) : null;
      if (edit.priceUsd !== numberString(work.price_usd)) payload.price_usd = edit.priceUsd.trim() ? Number(edit.priceUsd) : null;
      return { work, edit, payload };
    }).filter((item) => Object.keys(item.payload).length > 0);
    if (!changed.length) return;
    if (changed.some((item) => !item.edit.title.trim())) return setError("Each selected work needs a title.");
    const supabase = createClient();
    if (!supabase) return setError("Supabase is not configured.");
    setBusy(true); setError(""); setMessage("");
    const results = await Promise.all(changed.map((item) => supabase.from("works").update(item.payload).eq("id", item.work.id)));
    if (results.some((result) => result.error)) {
      setError("Some work details could not be saved.");
    } else {
      setWorks((current) => current.map((work) => {
        const item = changed.find((entry) => entry.work.id === work.id);
        return item ? { ...work, ...item.payload } : work;
      }));
      setMessage(`${changed.length} work${changed.length === 1 ? "" : "s"} updated.`);
    }
    setBusy(false);
  }

  async function quickAdd(files: FileList | null) {
    if (!files?.length) return;
    const supabase = createClient();
    if (!supabase) return setError("Supabase is not configured.");
    setBusy(true); setError(""); setMessage("");
    let added = 0;
    const addedIds: string[] = [];
    const failedFiles: string[] = [];
    for (const file of Array.from(files)) {
      if (!isSupportedArtworkFile(file)) {
        failedFiles.push(file.name);
        continue;
      }
      const id = crypto.randomUUID();
      const title = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim() || "Untitled work";
      const slug = `${slugify(title) || "untitled-work"}-${id.slice(0, 8)}`;
      const { error: workError } = await supabase.from("works").insert({ id, title, slug, year: new Date().getFullYear(), status: "draft", is_new: false, is_featured: false });
      if (workError) { failedFiles.push(file.name); continue; }
      const path = `works/${id}/${id}-${safeExtension(file.name)}`;
      const { error: uploadError } = await supabase.storage.from("artwork").upload(path, file, { contentType: contentTypeFor(file.name), upsert: false });
      if (uploadError) {
        await supabase.from("works").delete().eq("id", id);
        failedFiles.push(file.name);
        continue;
      }
      const { error: imageError } = await supabase.from("work_images").insert({ work_id: id, storage_path: path, alt: title, display_order: 0, is_primary: true });
      if (imageError) {
        await supabase.storage.from("artwork").remove([path]);
        await supabase.from("works").delete().eq("id", id);
        failedFiles.push(file.name);
        continue;
      }
      added += 1; addedIds.push(id);
    }
    setBusy(false);
    setMessage(`${added} draft${added === 1 ? "" : "s"} added.`);
    if (failedFiles.length) setError(`Could not add ${failedFiles.join(", ")}. Check the file type, size, and Studio permissions.`);
    if (addedIds.length) {
      const [{ data: newWorks }, { data: newImages }] = await Promise.all([
        supabase.from("works").select("*").in("id", addedIds),
        supabase.from("work_images").select("id, work_id, storage_path, alt, display_order, is_primary").in("work_id", addedIds),
      ]);
      const imageMap = new Map<string, AdminCatalogueImage[]>();
      (newImages ?? []).forEach((image) => imageMap.set(image.work_id, [...(imageMap.get(image.work_id) ?? []), { ...image, url: getArtworkUrl(supabase, image.storage_path) }]));
      setWorks((current) => [...current, ...(newWorks ?? []).map((work) => ({ ...work, series_name: null, images: imageMap.get(work.id) ?? [] }))]);
      setSelected(new Set(addedIds));
      router.refresh();
    }
    if (quickAddRef.current) quickAddRef.current.value = "";
  }

  async function deleteWork(work: AdminCatalogueWork) {
    if (!window.confirm(`Delete “${work.title}” and its images? This cannot be undone.`)) return;
    setBusy(true); setError(""); setMessage("");
    const result = await deleteCatalogueWork(work.id);
    if (!result.ok) {
      setError(result.error ?? "Could not delete that work.");
    } else {
      setWorks((current) => current.filter((item) => item.id !== work.id));
      setSelected((current) => { const next = new Set(current); next.delete(work.id); return next; });
      setMessage(result.warning ?? `${work.title} deleted.`);
    }
    setBusy(false);
  }

  return (
    <section className="admin-catalogue-tools">
      <div className="admin-catalogue-toolbar">
        <Hint id="catalogueSearch"><label className="admin-catalogue-search">Search catalogue<input aria-label="Search catalogue" placeholder="Title, series, slug, medium, or year…" value={search} onChange={(event) => setSearch(event.target.value)} />{search && <Hint id="clearSearch"><button aria-label="Clear catalogue search" onClick={() => setSearch("")} type="button">×</button></Hint>}</label></Hint>
        <Hint id="statusFilters"><label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as WorkStatus | "all")}>{statuses.map((status) => <option key={status} value={status}>{status === "all" ? "All statuses" : titleCase(status)}</option>)}</select></label></Hint>
        <Hint id="seriesFilter"><label>Series<select value={seriesFilter} onChange={(event) => setSeriesFilter(event.target.value)}><option value="all">All series</option>{initialSeries.map((series) => <option key={series.id} value={series.id}>{series.name}</option>)}</select></label></Hint>
        <div className="admin-quick-add"><input ref={quickAddRef} accept=".jpg,.jpeg,.png,.webp,.gif,.heic,.heif,image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif" multiple onChange={(event: ChangeEvent<HTMLInputElement>) => void quickAdd(event.target.files)} type="file" /><Hint id="quickAdd"><button className="admin-action-button" onClick={() => quickAddRef.current?.click()} type="button"><span className="admin-action-label">Batch upload artwork</span></button></Hint></div>
      </div>

      {selected.size > 0 && <div className="admin-batch-bar">
        <strong>{selected.size} selected</strong>
        <Hint id="bulkStatus"><select aria-label="Bulk status" value={batchStatus} onChange={(event) => setBatchStatus(event.target.value as WorkStatus | "")}><option value="">Set status…</option>{statuses.slice(1).map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select></Hint>
        <Hint id="bulkSeries"><select aria-label="Bulk series" value={batchSeries} onChange={(event) => setBatchSeries(event.target.value)}><option value="">Assign series…</option><option value="__none__">No series</option>{initialSeries.map((series) => <option key={series.id} value={series.id}>{series.name}</option>)}</select></Hint>
        <Hint id="createSeries"><input aria-label="Create new series" placeholder="Or create new series…" value={batchNewSeriesName} onChange={(event) => { setBatchNewSeriesName(event.target.value); setBatchSeries(""); }} /></Hint>
        <Hint id="applyBulk"><button className="admin-action-button" disabled={busy || (!batchStatus && !batchSeries && !batchNewSeriesName.trim())} onClick={() => void applyBatch()} type="button"><span className="admin-action-label">Apply status / series</span></button></Hint>
      </div>}
      {selected.size > 0 && <section className="admin-batch-details">
        <div><h2>Batch edit details</h2><p>Only filled fields change. Leave fields blank to keep each work’s current value.</p></div>
        <div className="admin-batch-details-grid">
          <label>Year<input min="1900" type="number" value={batchDetails.year} onChange={(event) => setBatchDetails((current) => ({ ...current, year: event.target.value }))} /></label>
          <label>Month<select value={batchDetails.month} onChange={(event) => setBatchDetails((current) => ({ ...current, month: event.target.value }))}><option value="">Leave unchanged</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Date(2020, index, 1).toLocaleString("en", { month: "long" })}</option>)}</select></label>
          <label>Medium<input value={batchDetails.medium} onChange={(event) => setBatchDetails((current) => ({ ...current, medium: event.target.value }))} /></label>
          <label>Price PHP<input min="0" step="0.01" type="number" value={batchDetails.pricePhp} onChange={(event) => setBatchDetails((current) => ({ ...current, pricePhp: event.target.value }))} /></label>
          <label>Price USD<input min="0" step="0.01" type="number" value={batchDetails.priceUsd} onChange={(event) => setBatchDetails((current) => ({ ...current, priceUsd: event.target.value }))} /></label>
          <label>Price on request<select value={batchDetails.priceOnRequest} onChange={(event) => setBatchDetails((current) => ({ ...current, priceOnRequest: event.target.value as TriState }))}><option value="">Leave unchanged</option><option value="true">Yes</option><option value="false">No</option></select></label>
          <label>Mark as new<select value={batchDetails.isNew} onChange={(event) => setBatchDetails((current) => ({ ...current, isNew: event.target.value as TriState }))}><option value="">Leave unchanged</option><option value="true">Yes</option><option value="false">No</option></select></label>
          <label>Featured<select value={batchDetails.isFeatured} onChange={(event) => setBatchDetails((current) => ({ ...current, isFeatured: event.target.value as TriState }))}><option value="">Leave unchanged</option><option value="true">Yes</option><option value="false">No</option></select></label>
          <label className="field-wide">Description<textarea rows={3} value={batchDetails.description} onChange={(event) => setBatchDetails((current) => ({ ...current, description: event.target.value }))} /></label>
        </div>
        <Hint id="applyDetails"><button className="admin-action-button" disabled={busy || !hasBatchDetails(batchDetails)} onClick={() => void applyBatch()} type="button"><span className="admin-action-label">Apply details to {selected.size} works</span></button></Hint>
      </section>}
      {selected.size > 0 && <section className="admin-selected-editor">
        <div><h2>Edit selected works</h2><p>These titles are the names customers see in the shop. Prices can be different for every painting.</p></div>
        <div className="admin-selected-editor-list">
          {works.filter((work) => selected.has(work.id)).map((work) => {
            const edit = inlineEdits[work.id] ?? inlineEditFor(work);
            const image = work.images.find((item) => item.is_primary) ?? work.images[0];
            return <div className="admin-selected-editor-row" key={work.id}>
              <div className="admin-selected-editor-thumb">{image ? <img alt="" src={image.url} /> : <span>No image</span>}</div>
              <label>Shop title<input value={edit.title} onChange={(event) => setInlineEdits((current) => ({ ...current, [work.id]: { ...edit, title: event.target.value } }))} /></label>
              <label>PHP price<input min="0" step="0.01" type="number" value={edit.pricePhp} onChange={(event) => setInlineEdits((current) => ({ ...current, [work.id]: { ...edit, pricePhp: event.target.value } }))} /></label>
              <label>USD price<input min="0" step="0.01" type="number" value={edit.priceUsd} onChange={(event) => setInlineEdits((current) => ({ ...current, [work.id]: { ...edit, priceUsd: event.target.value } }))} /></label>
            </div>;
          })}
        </div>
        <Hint id="saveSelected"><button className="admin-action-button" disabled={busy} onClick={() => void saveInlineEdits()} type="button"><span className="admin-action-label">Save selected details</span></button></Hint>
      </section>}
      {message && <p className="admin-inline-success" role="status">{message}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}

      <div className="admin-work-list">
        <div className="admin-list-header"><Hint id="selectAll"><label><input checked={filteredWorks.length > 0 && filteredWorks.every((work) => selected.has(work.id))} onChange={toggleAll} type="checkbox" /> Select all</label></Hint><span>{filteredWorks.length} shown · {works.length} total · newest first</span></div>
        {filteredWorks.length ? filteredWorks.map((work) => <WorkRow key={work.id} work={work} selected={selected.has(work.id)} onSelect={() => toggleSelected(work.id)} onStatus={(status) => void setStatus(work.id, status)} onDelete={() => void deleteWork(work)} disabled={busy} />) : <div className="admin-empty-state">No works match these filters.</div>}
      </div>
    </section>
  );
}

function WorkRow({ work, selected, onSelect, onStatus, onDelete, disabled }: { work: AdminCatalogueWork; selected: boolean; onSelect: () => void; onStatus: (status: WorkStatus) => void; onDelete: () => void; disabled: boolean }) {
  const image = work.images.find((item) => item.is_primary) ?? work.images[0];
  return (
    <article className="admin-work-row">
      <input aria-label={`Select ${work.title}`} checked={selected} onChange={onSelect} type="checkbox" />
      <div className="admin-work-thumb">{image ? <img alt={image.alt ?? work.title} src={image.url} /> : <span>No image</span>}</div>
      <div className="admin-work-summary"><Hint id="viewWork"><Link href={`/studio/catalogue/${work.id}`}>{work.title}</Link></Hint><span>{work.year}{work.month ? ` · ${monthName(work.month)}` : ""} · {work.series_name ?? "Unassigned"}</span></div>
      <span className={`admin-status-badge status-${work.status}`}>{titleCase(work.status)}{work.is_new ? " · New" : ""}</span>
      <span className="admin-work-price">{formatPrice(work)}</span>
      <Hint id="rowStatus"><select aria-label={`Set status for ${work.title}`} className="admin-row-status" disabled={disabled} value={work.status} onChange={(event) => onStatus(event.target.value as WorkStatus)}>{statuses.slice(1).map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select></Hint>
      <button className="admin-small-button admin-danger-button" disabled={disabled} onClick={onDelete} type="button">Delete</button>
    </article>
  );
}

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function safeExtension(value: string) { const extension = value.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif|heic|heif)$/)?.[1] ?? "jpg"; return `${crypto.randomUUID()}.${extension}`; }
function contentTypeFor(value: string) { const extension = value.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif|heic|heif)$/)?.[1]; return extension === "heic" ? "image/heic" : extension === "heif" ? "image/heif" : extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : extension === "gif" ? "image/gif" : "image/jpeg"; }
function isSupportedArtworkFile(file: File) { return /\.(jpg|jpeg|png|webp|gif|heic|heif)$/i.test(file.name) && file.size > 0 && file.size <= 10 * 1024 * 1024; }
function titleCase(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function monthName(value: number) { return new Date(2020, value - 1, 1).toLocaleString("en", { month: "short" }); }
function numberString(value: number | null) { return value === null ? "" : String(value); }
function inlineEditFor(work: AdminCatalogueWork): InlineEdit { return { title: work.title, pricePhp: numberString(work.price_php), priceUsd: numberString(work.price_usd) }; }
function hasBatchDetails(details: BatchDetails) { return Object.values(details).some(Boolean); }
function createBatchPayload(status: WorkStatus | "", series: string, details: BatchDetails): Partial<Pick<Work, "status" | "series_id" | "year" | "month" | "medium" | "description" | "price_php" | "price_usd" | "price_on_request" | "is_new" | "is_featured">> {
  return {
    ...(status ? { status } : {}),
    ...(series ? { series_id: series === "__none__" ? null : series } : {}),
    ...(details.year ? { year: Number(details.year) } : {}),
    ...(details.month ? { month: Number(details.month) } : {}),
    ...(details.medium ? { medium: details.medium.trim() } : {}),
    ...(details.description ? { description: details.description.trim() } : {}),
    ...(details.pricePhp ? { price_php: Number(details.pricePhp) } : {}),
    ...(details.priceUsd ? { price_usd: Number(details.priceUsd) } : {}),
    ...(details.priceOnRequest ? { price_on_request: details.priceOnRequest === "true" } : {}),
    ...(details.isNew ? { is_new: details.isNew === "true" } : {}),
    ...(details.isFeatured ? { is_featured: details.isFeatured === "true" } : {}),
  };
}
