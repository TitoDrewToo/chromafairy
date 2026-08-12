"use client";

import Link from "next/link";
import { ChangeEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice, getArtworkUrl } from "../lib/catalogue";
import { createClient } from "../lib/supabase/client";
import type { Series, Work, WorkImage, WorkStatus } from "../lib/supabase/types";
import { Hint } from "./studio-hint";

export type AdminCatalogueImage = Pick<WorkImage, "id" | "work_id" | "storage_path" | "alt" | "display_order" | "is_primary"> & { url: string };
export type AdminCatalogueSeries = Pick<Series, "id" | "name" | "slug" | "year">;
export type AdminCatalogueWork = Work & { series_name: string | null; images: AdminCatalogueImage[] };

const statuses: Array<WorkStatus | "all"> = ["all", "draft", "available", "reserved", "sold"];
type TriState = "" | "true" | "false";
type BatchDetails = { year: string; month: string; medium: string; description: string; pricePhp: string; priceUsd: string; priceOnRequest: TriState; isNew: TriState; isFeatured: TriState };
const emptyBatchDetails: BatchDetails = { year: "", month: "", medium: "", description: "", pricePhp: "", priceUsd: "", priceOnRequest: "", isNew: "", isFeatured: "" };

export default function CatalogueAdmin({ initialWorks, initialSeries }: { initialWorks: AdminCatalogueWork[]; initialSeries: AdminCatalogueSeries[] }) {
  const router = useRouter();
  const quickAddRef = useRef<HTMLInputElement>(null);
  const [works, setWorks] = useState(initialWorks);
  const [statusFilter, setStatusFilter] = useState<WorkStatus | "all">("all");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchStatus, setBatchStatus] = useState<WorkStatus | "">("");
  const [batchSeries, setBatchSeries] = useState<string>("");
  const [batchDetails, setBatchDetails] = useState<BatchDetails>(emptyBatchDetails);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filteredWorks = useMemo(() => works
    .filter((work) => statusFilter === "all" || work.status === statusFilter)
    .filter((work) => seriesFilter === "all" || work.series_id === seriesFilter)
    .sort((a, b) => b.year - a.year || (b.month ?? 0) - (a.month ?? 0) || (b.created_at ?? "").localeCompare(a.created_at ?? "")), [works, statusFilter, seriesFilter]);

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) => current.size === filteredWorks.length ? new Set() : new Set(filteredWorks.map((work) => work.id)));
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
    if (!selected.size || (!batchStatus && !batchSeries && !hasBatchDetails(batchDetails))) return;
    const supabase = createClient();
    if (!supabase) return setError("Supabase is not configured.");
    setBusy(true); setError(""); setMessage("");
    const payloadForBatch = createBatchPayload(batchStatus, batchSeries, batchDetails);
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
        series_id: batchSeries ? batchSeries === "__none__" ? null : batchSeries : work.series_id,
        series_name: batchSeries ? batchSeries === "__none__" ? null : initialSeries.find((item) => item.id === batchSeries)?.name ?? null : work.series_name,
      } : work));
      setMessage(`${selected.size} work${selected.size === 1 ? "" : "s"} updated.`);
      setSelected(new Set()); setBatchStatus(""); setBatchSeries(""); setBatchDetails(emptyBatchDetails);
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
    for (const file of Array.from(files)) {
      const id = crypto.randomUUID();
      const title = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim() || "Untitled work";
      const slug = `${slugify(title) || "untitled-work"}-${id.slice(0, 8)}`;
      const { error: workError } = await supabase.from("works").insert({ id, title, slug, year: new Date().getFullYear(), status: "draft", is_new: false, is_featured: false });
      if (workError) continue;
      const path = `works/${id}/${id}-${safeExtension(file.name)}`;
      const { error: uploadError } = await supabase.storage.from("artwork").upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
      if (uploadError) continue;
      const { error: imageError } = await supabase.from("work_images").insert({ work_id: id, storage_path: path, alt: title, display_order: 0, is_primary: true });
      if (!imageError) { added += 1; addedIds.push(id); }
    }
    setBusy(false);
    setMessage(`${added} draft${added === 1 ? "" : "s"} added.`);
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

  return (
    <section className="admin-catalogue-tools">
      <div className="admin-catalogue-toolbar">
        <Hint id="statusFilters"><label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as WorkStatus | "all")}>{statuses.map((status) => <option key={status} value={status}>{status === "all" ? "All statuses" : titleCase(status)}</option>)}</select></label></Hint>
        <label>Series<select value={seriesFilter} onChange={(event) => setSeriesFilter(event.target.value)}><option value="all">All series</option>{initialSeries.map((series) => <option key={series.id} value={series.id}>{series.name}</option>)}</select></label>
        <div className="admin-quick-add"><input ref={quickAddRef} accept="image/*" multiple onChange={(event: ChangeEvent<HTMLInputElement>) => void quickAdd(event.target.files)} type="file" /><Hint id="quickAdd"><button className="admin-action-button" onClick={() => quickAddRef.current?.click()} type="button"><span className="admin-action-label">Batch upload artwork</span></button></Hint></div>
      </div>

      {selected.size > 0 && <div className="admin-batch-bar">
        <strong>{selected.size} selected</strong>
        <select aria-label="Bulk status" value={batchStatus} onChange={(event) => setBatchStatus(event.target.value as WorkStatus | "")}><option value="">Set status…</option>{statuses.slice(1).map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select>
        <select aria-label="Bulk series" value={batchSeries} onChange={(event) => setBatchSeries(event.target.value)}><option value="">Assign series…</option><option value="__none__">No series</option>{initialSeries.map((series) => <option key={series.id} value={series.id}>{series.name}</option>)}</select>
        <Hint id="applyBulk"><button className="admin-action-button" disabled={busy || (!batchStatus && !batchSeries)} onClick={() => void applyBatch()} type="button"><span className="admin-action-label">Apply status / series</span></button></Hint>
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
        <button className="admin-action-button" disabled={busy || !hasBatchDetails(batchDetails)} onClick={() => void applyBatch()} type="button"><span className="admin-action-label">Apply details to {selected.size} works</span></button>
      </section>}
      {message && <p className="admin-inline-success" role="status">{message}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}

      <div className="admin-work-list">
        <div className="admin-list-header"><label><input checked={filteredWorks.length > 0 && selected.size === filteredWorks.length} onChange={toggleAll} type="checkbox" /> Select all</label><span>{filteredWorks.length} shown · newest first</span></div>
        {filteredWorks.length ? filteredWorks.map((work) => <WorkRow key={work.id} work={work} selected={selected.has(work.id)} onSelect={() => toggleSelected(work.id)} onStatus={(status) => void setStatus(work.id, status)} />) : <div className="admin-empty-state">No works match these filters.</div>}
      </div>
    </section>
  );
}

function WorkRow({ work, selected, onSelect, onStatus }: { work: AdminCatalogueWork; selected: boolean; onSelect: () => void; onStatus: (status: WorkStatus) => void }) {
  const image = work.images.find((item) => item.is_primary) ?? work.images[0];
  return (
    <article className="admin-work-row">
      <input aria-label={`Select ${work.title}`} checked={selected} onChange={onSelect} type="checkbox" />
      <div className="admin-work-thumb">{image ? <img alt={image.alt ?? work.title} src={image.url} /> : <span>No image</span>}</div>
      <div className="admin-work-summary"><Hint id="viewWork"><Link href={`/studio/catalogue/${work.id}`}>{work.title}</Link></Hint><span>{work.year}{work.month ? ` · ${monthName(work.month)}` : ""} · {work.series_name ?? "Unassigned"}</span></div>
      <span className={`admin-status-badge status-${work.status}`}>{titleCase(work.status)}{work.is_new ? " · New" : ""}</span>
      <span className="admin-work-price">{formatPrice(work)}</span>
      <select aria-label={`Set status for ${work.title}`} className="admin-row-status" value={work.status} onChange={(event) => onStatus(event.target.value as WorkStatus)}>{statuses.slice(1).map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select>
    </article>
  );
}

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function safeExtension(value: string) { const extension = value.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/)?.[1] ?? "jpg"; return `${crypto.randomUUID()}.${extension}`; }
function titleCase(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function monthName(value: number) { return new Date(2020, value - 1, 1).toLocaleString("en", { month: "short" }); }
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
