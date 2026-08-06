"use client";

import { DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadArtworkImage } from "../app/actions/admin-catalogue";
import type { Series, Work, WorkImage, WorkStatus } from "../lib/supabase/types";
import { createClient } from "../lib/supabase/client";

type FormMode = "create" | "edit";
type SeriesOption = Pick<Series, "id" | "name" | "slug" | "year">;
type ExistingImage = Pick<WorkImage, "id" | "work_id" | "storage_path" | "alt" | "display_order" | "is_primary"> & { url: string };
type ImageDraft = ExistingImage & { file?: File; previewUrl?: string };

const statusOptions: WorkStatus[] = ["draft", "available", "reserved", "sold"];
const unitOptions = ["cm", "in"] as const;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export default function WorkForm({ mode, work, images = [], series }: { mode: FormMode; work?: Work; images?: ExistingImage[]; series: SeriesOption[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(work?.title ?? "");
  const [slug, setSlug] = useState(work?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [year, setYear] = useState(String(work?.year ?? new Date().getFullYear()));
  const [seriesId, setSeriesId] = useState(work?.series_id ?? "");
  const [newSeriesName, setNewSeriesName] = useState("");
  const [month, setMonth] = useState(work?.month ? String(work.month) : "");
  const [medium, setMedium] = useState(work?.medium ?? "");
  const [width, setWidth] = useState(numberValue(work?.width));
  const [height, setHeight] = useState(numberValue(work?.height));
  const [depth, setDepth] = useState(numberValue(work?.depth));
  const [unit, setUnit] = useState(work?.dimension_unit ?? "cm");
  const [description, setDescription] = useState(work?.description ?? "");
  const [pricePhp, setPricePhp] = useState(numberValue(work?.price_php));
  const [priceUsd, setPriceUsd] = useState(numberValue(work?.price_usd));
  const [priceOnRequest, setPriceOnRequest] = useState(work?.price_on_request ?? false);
  const [status, setStatus] = useState<WorkStatus>(work?.status ?? "draft");
  const [isNew, setIsNew] = useState(work?.is_new ?? false);
  const [isFeatured, setIsFeatured] = useState(work?.is_featured ?? false);
  const [packedWeight, setPackedWeight] = useState(numberValue(work?.packed_weight_kg));
  const [packedL, setPackedL] = useState(numberValue(work?.packed_l));
  const [packedW, setPackedW] = useState(numberValue(work?.packed_w));
  const [packedH, setPackedH] = useState(numberValue(work?.packed_h));
  const [shipRolled, setShipRolled] = useState(work?.ship_rolled ?? false);
  const [imageDrafts, setImageDrafts] = useState<ImageDraft[]>(images);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const imageDraftsRef = useRef(imageDrafts);

  const hasPrimary = useMemo(() => imageDrafts.some((image) => image.is_primary), [imageDrafts]);

  useEffect(() => () => {
    imageDraftsRef.current.forEach((image) => {
      if (image.previewUrl) URL.revokeObjectURL(image.previewUrl);
      if (image.url !== image.previewUrl && image.file) URL.revokeObjectURL(image.url);
    });
  }, []);
  useEffect(() => {
    imageDraftsRef.current = imageDrafts;
  }, [imageDrafts]);

  function updateTitle(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function addFiles(files: FileList | File[]) {
    const additions = Array.from(files).filter((file) => {
      const extension = file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
      return imageTypes.has(file.type) && ["jpg", "jpeg", "png", "webp", "gif"].includes(extension ?? "") && file.size <= MAX_IMAGE_BYTES;
    }).map((file, index) => ({
      id: `new-${crypto.randomUUID()}`,
      work_id: work?.id ?? "",
      storage_path: "",
      alt: title || file.name,
      display_order: imageDrafts.length + index,
      is_primary: !hasPrimary && imageDrafts.length === 0 && index === 0,
      url: URL.createObjectURL(file),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    if (additions.length < Array.from(files).length) setError("Only JPG, PNG, WebP, or GIF images up to 10 MB are accepted.");
    setImageDrafts((current) => [...current, ...additions]);
  }

  function dropFiles(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files);
  }

  function setPrimary(id: string) { setImageDrafts((current) => current.map((image) => ({ ...image, is_primary: image.id === id }))); }
  function moveImage(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= imageDrafts.length) return;
    setImageDrafts((current) => {
      const next = [...current]; [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next.map((image, order) => ({ ...image, display_order: order }));
    });
  }
  function removeImage(image: ImageDraft) {
    if (image.file || window.confirm("Remove this image from the work?")) {
      if (image.previewUrl) URL.revokeObjectURL(image.previewUrl);
      if (image.file && image.url !== image.previewUrl) URL.revokeObjectURL(image.url);
      setImageDrafts((current) => current.filter((item) => item.id !== image.id));
      if (!image.file) setRemovedImageIds((current) => [...current, image.id]);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !year || !Number(year)) return setError("Title and year are required.");
    if (!slug.trim()) return setError("Please add a slug.");
    const supabase = createClient();
    if (!supabase) return setError("Supabase is not configured.");
    setBusy(true); setError("");

    let selectedSeriesId = seriesId || null;
    if (newSeriesName.trim()) {
      const newId = crypto.randomUUID();
      const newSlug = slugify(newSeriesName) || `series-${newId.slice(0, 8)}`;
      const { error: seriesError } = await supabase.from("series").insert({ id: newId, name: newSeriesName.trim(), slug: newSlug, year: numberOrNull(year) });
      if (seriesError) { setBusy(false); return setError("Could not create that series. Check that its name and slug are unique."); }
      selectedSeriesId = newId;
    }

    const workId = work?.id ?? crypto.randomUUID();
    const payload = {
      id: workId,
      title: title.trim(), slug: slug.trim(), year: Number(year), series_id: selectedSeriesId,
      month: numberOrNull(month), medium: medium.trim() || null, width: numberOrNull(width), height: numberOrNull(height), depth: numberOrNull(depth), dimension_unit: unit,
      description: description.trim() || null, price_php: numberOrNull(pricePhp), price_usd: numberOrNull(priceUsd), price_on_request: priceOnRequest,
      status: "draft" as WorkStatus, is_new: isNew, is_featured: isFeatured,
      packed_weight_kg: numberOrNull(packedWeight), packed_l: numberOrNull(packedL), packed_w: numberOrNull(packedW), packed_h: numberOrNull(packedH), ship_rolled: shipRolled,
    };
    const writeResult = mode === "create"
      ? await supabase.from("works").insert(payload)
      : await supabase.from("works").update(payload).eq("id", workId);
    if (writeResult.error) { setBusy(false); return setError(writeResult.error.code === "23505" ? "That slug is already in use." : "Could not save the work."); }

    const imageErrors: string[] = [];
    const savedImages = imageDrafts.map((image, order) => ({ ...image, display_order: order, is_primary: hasPrimary ? image.is_primary : order === 0 }));
    for (const image of savedImages) {
      if (image.file) {
        const upload = await uploadArtworkImage({ workId, file: image.file, alt: image.alt || title, displayOrder: image.display_order, isPrimary: Boolean(image.is_primary) });
        if (!upload.ok) imageErrors.push(image.file.name);
      } else {
        const row = await supabase.from("work_images").update({ display_order: image.display_order, is_primary: image.is_primary, alt: image.alt }).eq("id", image.id);
        if (row.error) imageErrors.push(image.id);
      }
    }
    for (const imageId of removedImageIds) {
      const row = await supabase.from("work_images").delete().eq("id", imageId);
      if (row.error) imageErrors.push(imageId);
    }
    const finalUpdate = await supabase.from("works").update({ status: imageErrors.length ? "draft" : status }).eq("id", workId);
    if (finalUpdate.error) imageErrors.push("status");
    setBusy(false);
    if (imageErrors.length) return setError("The work was saved as a draft, but some image changes need attention.");
    router.push("/studio/catalogue"); router.refresh();
  }

  return (
    <form className="admin-work-form" onSubmit={submit}>
      <section className="admin-form-section"><h2>Identity</h2><div className="admin-form-grid">
        <label className="field-wide">Title *<input required value={title} onChange={(event) => updateTitle(event.target.value)} /></label>
        <label>Slug *<input required value={slug} onChange={(event) => { setSlugTouched(true); setSlug(slugify(event.target.value)); }} /></label>
        <label>Year *<input required min="1900" type="number" value={year} onChange={(event) => setYear(event.target.value)} /></label>
        <label>Month<select value={month} onChange={(event) => setMonth(event.target.value)}><option value="">Not set</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Date(2020, index, 1).toLocaleString("en", { month: "long" })}</option>)}</select></label>
        <label>Series<select value={seriesId} onChange={(event) => { setSeriesId(event.target.value); setNewSeriesName(""); }}><option value="">Unassigned</option>{series.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Or create new series<input placeholder="New series name" value={newSeriesName} onChange={(event) => { setNewSeriesName(event.target.value); setSeriesId(""); }} /></label>
        <label className="field-wide">Medium<input value={medium} onChange={(event) => setMedium(event.target.value)} /></label>
      </div></section>

      <section className="admin-form-section"><h2>Dimensions & description</h2><div className="admin-form-grid">
        <label>Width<input min="0" step="0.01" type="number" value={width} onChange={(event) => setWidth(event.target.value)} /></label><label>Height<input min="0" step="0.01" type="number" value={height} onChange={(event) => setHeight(event.target.value)} /></label><label>Depth<input min="0" step="0.01" type="number" value={depth} onChange={(event) => setDepth(event.target.value)} /></label><label>Unit<select value={unit} onChange={(event) => setUnit(event.target.value as typeof unit)}>{unitOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        <label className="field-wide">Description<textarea rows={6} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      </div></section>

      <section className="admin-form-section"><h2>Pricing & status</h2><div className="admin-form-grid">
        <label>Price PHP<input min="0" step="0.01" type="number" value={pricePhp} onChange={(event) => setPricePhp(event.target.value)} /></label><label>Price USD<input min="0" step="0.01" type="number" value={priceUsd} onChange={(event) => setPriceUsd(event.target.value)} /></label>
        <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as WorkStatus)}>{statusOptions.map((option) => <option key={option} value={option}>{titleCase(option)}</option>)}</select></label>
        <label className="admin-check"><input checked={priceOnRequest} onChange={(event) => setPriceOnRequest(event.target.checked)} type="checkbox" /> Price on request</label><label className="admin-check"><input checked={isNew} onChange={(event) => setIsNew(event.target.checked)} type="checkbox" /> Mark as new</label><label className="admin-check"><input checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} type="checkbox" /> Featured</label>
      </div></section>

      <section className="admin-form-section"><h2>Shipping (optional)</h2><div className="admin-form-grid"><label>Packed weight kg<input min="0" step="0.01" type="number" value={packedWeight} onChange={(event) => setPackedWeight(event.target.value)} /></label><label>Packed length<input min="0" step="0.01" type="number" value={packedL} onChange={(event) => setPackedL(event.target.value)} /></label><label>Packed width<input min="0" step="0.01" type="number" value={packedW} onChange={(event) => setPackedW(event.target.value)} /></label><label>Packed height<input min="0" step="0.01" type="number" value={packedH} onChange={(event) => setPackedH(event.target.value)} /></label><label className="admin-check"><input checked={shipRolled} onChange={(event) => setShipRolled(event.target.checked)} type="checkbox" /> Can ship rolled</label></div></section>

      <section className="admin-form-section"><h2>Images</h2><div className={`admin-dropzone ${dragging ? "is-dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDragOver={(event) => event.preventDefault()} onDrop={dropFiles}><strong>Drop artwork images here</strong><span>or choose files below</span><input accept="image/*" multiple onChange={(event) => event.target.files && addFiles(event.target.files)} type="file" /></div>{imageDrafts.length > 0 && <div className="admin-image-list">{imageDrafts.map((image, index) => <div className="admin-image-item" key={image.id}><img alt={image.alt ?? title} src={image.previewUrl ?? image.url} /><div><strong>{index + 1}. {image.alt || "Artwork image"}</strong><div className="admin-image-actions"><button className="admin-small-button" onClick={() => setPrimary(image.id)} type="button">{image.is_primary ? "Primary" : "Make primary"}</button><button className="admin-small-button" disabled={index === 0} onClick={() => moveImage(index, -1)} type="button">↑</button><button className="admin-small-button" disabled={index === imageDrafts.length - 1} onClick={() => moveImage(index, 1)} type="button">↓</button><button className="admin-small-button admin-danger-button" onClick={() => removeImage(image)} type="button">Remove</button></div></div></div>)}</div>}{!hasPrimary && imageDrafts.length > 0 && <p className="admin-form-note">The first image will be used as primary.</p>}</section>

      {error && <p className="admin-error" role="alert">{error}</p>}
      <div className="admin-form-actions"><button className="admin-action-button" disabled={busy} type="submit"><span className="admin-action-label">{busy ? "Saving…" : mode === "create" ? "Create work" : "Save changes"}</span></button><button className="admin-secondary-button" onClick={() => router.push("/studio/catalogue")} type="button">Cancel</button></div>
    </form>
  );
}

function numberValue(value: number | null | undefined) { return value === null || value === undefined ? "" : String(value); }
function numberOrNull(value: string) { return value.trim() ? Number(value) : null; }
function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function titleCase(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
