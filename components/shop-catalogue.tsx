"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatPrice } from "../lib/catalogue";

export type CatalogueSeries = { id: string; name: string };
export type CatalogueImage = { storage_path: string; alt: string | null; is_primary: boolean | null };
export type CatalogueWork = {
  id: string;
  title: string;
  slug: string;
  year: number;
  status: "available" | "reserved" | "sold";
  is_new: boolean | null;
  price_php: number | null;
  price_usd: number | null;
  price_on_request: boolean | null;
  series_id: string | null;
  series_name: string | null;
  images: CatalogueImage[];
};

type StatusFilter = "available" | "archive";
type SortMode = "year" | "series";

function statusLabel(status: CatalogueWork["status"], isNew: boolean | null) {
  if (status === "sold") return "Sold";
  if (status === "reserved") return "Reserved";
  return isNew ? "Available · New" : "Available";
}

function groupLabel(work: CatalogueWork, sortMode: SortMode) {
  return sortMode === "series" ? work.series_name ?? "Independent works" : String(work.year);
}

function Placeholder() {
  return <div className="shop-placeholder">Chroma Fairy</div>;
}

function WorkCard({ work }: { work: CatalogueWork }) {
  const image = work.images[0];
  return (
    <article className="shop-card">
      <Link href={`/shop/${work.slug}`} aria-label={`View ${work.title}`}>
        <div className="shop-card-image">
          {image ? <img src={image.storage_path} alt={image.alt ?? work.title} /> : <Placeholder />}
          <span className={`shop-card-badge ${work.status}`}>{statusLabel(work.status, work.is_new)}</span>
        </div>
      </Link>
      <div className="shop-card-copy">
        <div className="shop-card-meta"><span>{work.series_name ?? "Original work"}</span><span>{work.year}</span></div>
        <Link className="shop-card-title" href={`/shop/${work.slug}`}>{work.title}</Link>
        <div className="shop-card-price">{formatPrice(work)}</div>
      </div>
    </article>
  );
}

export default function ShopCatalogue({ works }: { works: CatalogueWork[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("available");
  const [sortMode, setSortMode] = useState<SortMode>("year");

  const groupedWorks = useMemo(() => {
    const filtered = works
      .filter((work) => statusFilter === "available" ? work.status === "available" : work.status === "sold" || work.status === "reserved")
      .sort((a, b) => {
        if (sortMode === "series") {
          return (a.series_name ?? "Independent works").localeCompare(b.series_name ?? "Independent works") || b.year - a.year || a.title.localeCompare(b.title);
        }
        return b.year - a.year || a.title.localeCompare(b.title);
      });

    return Array.from(new Map(filtered.map((work) => [groupLabel(work, sortMode), [] as CatalogueWork[]])).entries())
      .map(([label]) => ({ label, works: filtered.filter((work) => groupLabel(work, sortMode) === label) }));
  }, [sortMode, statusFilter, works]);

  return (
    <>
      <div className="shop-controls" aria-label="Catalogue controls">
        <div className="shop-control-group">
          <span className="shop-control-label">View</span>
          <button className={`shop-filter ${statusFilter === "available" ? "active" : ""}`} onClick={() => setStatusFilter("available")} type="button">Available / New</button>
          <button className={`shop-filter ${statusFilter === "archive" ? "active" : ""}`} onClick={() => setStatusFilter("archive")} type="button">Sold / Reserved</button>
        </div>
        <div className="shop-control-group">
          <span className="shop-control-label">Arrange</span>
          <button className={`shop-filter ${sortMode === "year" ? "active" : ""}`} onClick={() => setSortMode("year")} type="button">By year</button>
          <button className={`shop-filter ${sortMode === "series" ? "active" : ""}`} onClick={() => setSortMode("series")} type="button">By series</button>
        </div>
        <span className="shop-result-count">{works.filter((work) => statusFilter === "available" ? work.status === "available" : work.status !== "available").length} works</span>
      </div>

      {groupedWorks.length ? groupedWorks.map((group) => (
        <section className="shop-group" key={group.label}>
          <h2 className="shop-group-heading">{group.label}</h2>
          <div className="shop-grid">{group.works.map((work) => <WorkCard key={work.id} work={work} />)}</div>
        </section>
      )) : <div className="shop-empty">No works in this view yet.</div>}
    </>
  );
}
