"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatPrice } from "../lib/catalogue";
import ShopImage from "./shop-image";

export type CatalogueImage = { storage_path: string; alt: string | null; is_primary: boolean | null };
export type CatalogueWork = {
  id: string;
  title: string;
  slug: string;
  year: number;
  month: number | null;
  status: "available" | "reserved" | "sold";
  is_new: boolean | null;
  price_php: number | null;
  price_usd: number | null;
  price_on_request: boolean | null;
  series_id: string | null;
  series_name: string | null;
  images: CatalogueImage[];
};

function statusLabel(status: CatalogueWork["status"], isNew: boolean | null) {
  if (status === "sold") return "Sold";
  if (status === "reserved") return "Reserved";
  return isNew ? "Available · New" : "Available";
}

function WorkCard({ work }: { work: CatalogueWork }) {
  const image = work.images[0];
  return (
    <article className="shop-card">
      <Link className="chroma-text" href={`/shop/${work.slug}`} aria-label={`View ${work.title}`}>
        <div className="shop-card-image">
          <ShopImage alt={image?.alt ?? work.title} src={image?.storage_path} />
          <span className={`shop-card-badge ${work.status}`}>{statusLabel(work.status, work.is_new)}</span>
        </div>
      </Link>
      <div className="shop-card-copy">
        <div className="shop-card-meta"><span>{work.series_name ?? "Original work"}</span><span>{work.year}</span></div>
        <Link className="shop-card-title chroma-text" href={`/shop/${work.slug}`}>{work.title}</Link>
        <div className="shop-card-price">{formatPrice(work)}</div>
      </div>
    </article>
  );
}

function monthLabel(month: number) {
  return new Date(2020, month - 1).toLocaleString("en", { month: "long" });
}

export default function ShopCatalogue({ works }: { works: CatalogueWork[] }) {
  const years = useMemo(() => Array.from(new Set(works.map((work) => work.year))).sort((a, b) => b - a), [works]);
  const [showAvailable, setShowAvailable] = useState(true);
  const [showArchive, setShowArchive] = useState(true);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(() => new Set());

  const filteredWorks = useMemo(() => works.filter((work) => {
    const isAvailable = work.status === "available";
    const isArchive = work.status === "sold" || work.status === "reserved";
    return (isAvailable && showAvailable) || (isArchive && showArchive);
  }), [showArchive, showAvailable, works]);

  const yearGroups = useMemo(() => years.map((year) => {
    const yearWorks = filteredWorks.filter((work) => work.year === year);
    const seriesGroups = Array.from(new Set(yearWorks.map((work) => work.series_name ?? "Independent works")))
      .sort((a, b) => a.localeCompare(b))
      .map((seriesName) => {
        const seriesWorks = yearWorks
          .filter((work) => (work.series_name ?? "Independent works") === seriesName)
          .sort((a, b) => (a.month ?? 13) - (b.month ?? 13) || a.title.localeCompare(b.title));
        const monthCount = new Set(seriesWorks.map((work) => work.month).filter((month): month is number => month !== null)).size;
        const monthGroups = monthCount > 1
          ? Array.from(new Set(seriesWorks.map((work) => work.month)))
            .sort((a, b) => (a ?? 13) - (b ?? 13))
            .map((month) => ({ month, works: seriesWorks.filter((work) => work.month === month) }))
          : [{ month: null, works: seriesWorks }];
        return { seriesName, monthGroups };
      })
      .filter((group) => group.monthGroups.some((monthGroup) => monthGroup.works.length));
    return { year, seriesGroups };
  }), [filteredWorks, years]);
  const firstVisibleYear = yearGroups.find((group) => group.seriesGroups.length)?.year;

  const allExpanded = years.length > 0 && years.every((year) => expandedYears.has(year));
  const toggleYear = (year: number) => setExpandedYears((current) => {
    const next = new Set(current);
    if (next.has(year)) next.delete(year); else next.add(year);
    return next;
  });
  const expandAll = () => setExpandedYears(allExpanded ? new Set() : new Set(years));

  return (
    <>
      <div className="shop-controls" aria-label="Catalogue controls">
        <div className="shop-control-group">
          <span className="shop-control-label">View</span>
          <button aria-pressed={showAvailable} className={`shop-filter shop-status-filter chroma-control ${showAvailable ? "active" : ""}`} onClick={() => setShowAvailable((value) => !value)} type="button"><span className="shop-filter-label">Available / New</span></button>
          <button aria-pressed={showArchive} className={`shop-filter shop-status-filter chroma-control ${showArchive ? "active" : ""}`} onClick={() => setShowArchive((value) => !value)} type="button"><span className="shop-filter-label">Sold / Reserved</span></button>
        </div>
        <div className="shop-control-group">
          <span className="shop-control-label">Arrange</span>
          <button className="shop-filter chroma-control active" onClick={expandAll} type="button">{allExpanded ? "Collapse all" : "Expand all"}</button>
        </div>
        <span className="shop-result-count">{filteredWorks.length} works</span>
      </div>

      {yearGroups.some((group) => group.seriesGroups.length) ? yearGroups.map((yearGroup) => {
        const expanded = expandedYears.has(yearGroup.year) || (expandedYears.size === 0 && yearGroup.year === firstVisibleYear);
        return (
          <section className="shop-group" key={yearGroup.year}>
            <button aria-expanded={expanded} className="shop-year-toggle chroma-text" onClick={() => toggleYear(yearGroup.year)} type="button">
              <span className={`shop-chevron ${expanded ? "expanded" : ""}`} aria-hidden="true">⌄</span><span>{yearGroup.year}</span>
            </button>
            {expanded && <div className="shop-year-content">{yearGroup.seriesGroups.map((seriesGroup) => (
              <section className="shop-series-group" key={seriesGroup.seriesName}>
                <h3 className="shop-series-heading">{seriesGroup.seriesName}</h3>
                {seriesGroup.monthGroups.map((monthGroup) => <div key={monthGroup.month ?? "all"}>
                  {monthGroup.month !== null && <h4 className="shop-month-heading">{monthLabel(monthGroup.month)}</h4>}
                  <div className="shop-grid">{monthGroup.works.map((work) => <WorkCard key={work.id} work={work} />)}</div>
                </div>)}
              </section>
            ))}</div>}
          </section>
        );
      }) : <div className="shop-empty">No works in this view yet.</div>}
    </>
  );
}
