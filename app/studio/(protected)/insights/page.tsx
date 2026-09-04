import Link from "next/link";
import { redirect } from "next/navigation";
import { Hint } from "../../../../components/studio-hint";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { createClient } from "../../../../lib/supabase/server";
import "../../admin.css";
import "../../operations.css";

export const dynamic = "force-dynamic";

type Period = "day" | "week" | "month";
type Range = { from: Date; to: Date };
type SearchParams = { period?: string; offset?: string };
type Summary = { total_views: number; unique_visitors_today: number; top_referrer: string | null; tracked_days: number };
type TrafficPoint = { period_start: string; views: number; unique_visitors: number | null };
type InquiryPoint = { period_start: string; inquiries: number };
type Point = { label: string; periodStart: string; views: number; inquiries: number; conversion: number };
type DailyAverages = { covered_days: number; avg_daily_people: number; avg_daily_views: number };
type ArtworkAttention = { pieces_viewed: number; piece_views: number; piece_unique_viewers: number; views_per_piece: number | null };
type TopArtwork = { work_id: string | null; slug: string; title: string; status: string; primary_image: string | null; views: number; unique_viewers: number; prev_views: number };
type TrackingStartRpc = (functionName: "get_tracking_started_at", args: Record<string, never>) => Promise<{ data: string | null; error: unknown }>;
type DailyAveragesRpc = (functionName: "get_daily_averages", args: { p_from: string; p_to: string }) => Promise<{ data: DailyAverages[] | null; error: unknown }>;
type ArtworkAttentionRpc = (functionName: "get_artwork_attention_summary", args: { p_from: string; p_to: string }) => Promise<{ data: ArtworkAttention[] | null; error: unknown }>;
type TopArtworksRpc = (functionName: "get_top_artworks", args: { p_from: string; p_to: string; p_limit: number }) => Promise<{ data: TopArtwork[] | null; error: unknown }>;

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

export default async function AdminInsightsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { period, offset } = await getSelection(searchParams);
  const sessionClient = await createClient();
  if (!sessionClient) return <AdminMessage message="Supabase is not configured." />;
  const { data: canViewInsights } = await sessionClient.rpc("is_user_manager");
  if (!canViewInsights) redirect("/studio");

  const admin = createAdminClient();
  if (!admin) return <AdminMessage message="Insights are not configured." />;
  const currentRange = getPeriodRange(period, offset);
  const previousRange = getPeriodRange(period, offset - 1);
  const trendRange = getTrendRange(period, currentRange);
  const lifetimeTo = new Date();
  const trackingStartRpc = admin.rpc.bind(admin) as unknown as TrackingStartRpc;
  const dailyAveragesRpc = admin.rpc.bind(admin) as unknown as DailyAveragesRpc;
  const artworkAttentionRpc = admin.rpc.bind(admin) as unknown as ArtworkAttentionRpc;
  const topArtworksRpc = admin.rpc.bind(admin) as unknown as TopArtworksRpc;
  const [currentSummary, previousSummary, currentInquiries, previousInquiries, traffic, inquiries, topPages, lifetime, trackingStart, dailyAverages, artworkAttention, topArtworks] = await Promise.all([
    admin.rpc("get_traffic_summary", toRpcRange(currentRange)),
    admin.rpc("get_traffic_summary", toRpcRange(previousRange)),
    admin.rpc("get_inquiry_total", toRpcRange(currentRange)),
    admin.rpc("get_inquiry_total", toRpcRange(previousRange)),
    admin.rpc("get_views_by_period", { p_granularity: period, ...toRpcRange(trendRange) }),
    admin.rpc("get_inquiry_counts_by_period", { p_granularity: period, ...toRpcRange(trendRange) }),
    admin.rpc("get_top_pages", { ...toRpcRange(currentRange), p_limit: 7 }),
    admin.rpc("get_traffic_summary", { p_from: new Date(0).toISOString(), p_to: lifetimeTo.toISOString() }),
    trackingStartRpc("get_tracking_started_at", {}),
    dailyAveragesRpc("get_daily_averages", toRpcRange(currentRange)),
    artworkAttentionRpc("get_artwork_attention_summary", toRpcRange(currentRange)),
    topArtworksRpc("get_top_artworks", { ...toRpcRange(currentRange), p_limit: 8 }),
  ]);

  if (currentSummary.error || previousSummary.error || currentInquiries.error || previousInquiries.error || traffic.error || inquiries.error || topPages.error || lifetime.error || trackingStart.error || dailyAverages.error || artworkAttention.error || topArtworks.error) return <AdminMessage message="Insights could not be loaded." />;
  const current = currentSummary.data?.[0] ?? emptySummary();
  const previous = previousSummary.data?.[0] ?? emptySummary();
  const currentInquiryCount = currentInquiries.data ?? 0;
  const previousInquiryCount = previousInquiries.data ?? 0;
  const trafficPoints = (traffic.data ?? []) as TrafficPoint[];
  const inquiryPoints = (inquiries.data ?? []) as InquiryPoint[];
  const points = buildPoints(trafficPoints, inquiryPoints);
  const lifetimeSummary = lifetime.data?.[0] ?? emptySummary();
  const trackingStartedAt = trackingStart.data ? new Date(trackingStart.data) : null;
  const averages = dailyAverages.data?.[0];
  const artworkSummary = artworkAttention.data?.[0] ?? emptyArtworkAttention();
  const artworks = (topArtworks.data ?? []) as TopArtwork[];
  const viewsCoverCurrentPeriod = trackingStartedAt !== null && trackingStartedAt <= currentRange.from;
  const viewsCoverPreviousPeriod = trackingStartedAt !== null && trackingStartedAt <= previousRange.from;
  const hasEverTracked = lifetimeSummary.total_views > 0;
  const hasPeriodData = current.total_views > 0 || currentInquiryCount > 0;
  const previousLabel = previousPeriodLabel(period);
  const viewsDelta = viewsCoverPreviousPeriod && previous.total_views > 0 ? current.total_views - previous.total_views : null;
  const inquiryDelta = previous.total_views > 0 || previousInquiryCount > 0 ? currentInquiryCount - previousInquiryCount : null;
  const currentConversion = viewsCoverCurrentPeriod ? conversion(currentInquiryCount, current.total_views) : null;
  const previousConversion = viewsCoverPreviousPeriod ? conversion(previousInquiryCount, previous.total_views) : null;
  const conversionDelta = previousConversion !== null && currentConversion !== null ? currentConversion - previousConversion : null;
  const currentDayVisitors = period === "day" ? trafficPoints.find((point) => point.period_start === dateKey(currentRange.from))?.unique_visitors ?? 0 : null;
  const averagesReady = period !== "day" && averages !== undefined && averages.covered_days >= 7;
  const selectionQuery = (nextPeriod: Period, nextOffset = 0) => `/studio/insights?period=${nextPeriod}&offset=${nextOffset}`;
  const trendViews = points.filter((point) => point.views > 0);
  const trendInquiries = points.filter((point) => point.inquiries > 0);

  return (
    <div className="admin-dashboard admin-operations-page admin-insights-page">
      <div className="admin-insights-heading">
        <div>
          <p className="admin-eyebrow">Studio intelligence</p>
          <h1>What the site is saying</h1>
          <p className="admin-muted">Attention becomes meaningful when it leads to a conversation.</p>
          {trackingStartedAt ? <p className="admin-insights-coverage">Tracking since {formatTrackingDate(trackingStartedAt)} · {formatNumber(lifetimeSummary.tracked_days)} day{lifetimeSummary.tracked_days === 1 ? "" : "s"} of data</p> : null}
        </div>
        <div className="admin-insights-controls">
          <nav className="admin-period-selector" aria-label="Insight period">
            {PERIODS.map((item) => <Hint id="insightPeriod" key={item.value}><Link className={item.value === period ? "is-selected" : ""} href={selectionQuery(item.value)} aria-current={item.value === period ? "page" : undefined}>{item.label}</Link></Hint>)}
          </nav>
          <div className="admin-insights-range-nav" aria-label={`${periodLabel(period)} range navigation`}>
            <Link href={selectionQuery(period, offset - 1)} aria-label={`Previous ${period}`}>←</Link>
            <span><strong>{rangeLabel(currentRange, period)}</strong><small>{offset === 0 ? periodCurrentLabel(period) : periodOffsetLabel(period, offset)}</small></span>
            {offset < 0 ? <Link href={selectionQuery(period, offset + 1)} aria-label={`Next ${period}`}>→</Link> : <span className="is-disabled" aria-hidden="true">→</span>}
          </div>
        </div>
      </div>

      {!hasEverTracked ? <EmptyState kind="none" message="No traffic recorded yet. Tracking has started, and figures will appear as visitors arrive." /> : !hasPeriodData ? <EmptyState kind="period" message={`No traffic or inquiries in ${rangeLabel(currentRange, period)}.`} /> : points.length > 0 && points.filter((point) => point.views > 0 || point.inquiries > 0).length < 6 ? <EmptyState kind="sparse" message="Figures are ready. Trends appear after six populated periods." /> : null}

      <section className="admin-insight-outcome" aria-labelledby="outcome-heading">
        <div><p className="admin-eyebrow">Outcome</p><h2 id="outcome-heading">Inquiries submitted</h2><p>Real inquiries received in the selected period. Test submissions are excluded.</p></div>
        <div className="admin-insights-hero"><strong>{formatNumber(currentInquiryCount)}</strong><span>{periodLabel(period).toLowerCase()}</span><small>{formatDelta(inquiryDelta, previousLabel, false) ?? "No earlier period to compare"}</small></div>
      </section>

      <section className="admin-insight-block" aria-labelledby="attention-heading">
        <div className="admin-insights-section-heading"><div><h2 id="attention-heading">Attention</h2><p>How much attention arrived, and how deeply it travelled.</p></div><span>{rangeLabel(currentRange, period)}</span></div>
        <div className="admin-insight-stat-row">
          <Hint id="insightViews"><Stat label="Views" value={formatNumber(current.total_views)} delta={formatDelta(viewsDelta, previousLabel, false)} note={currentConversion === null && trackingStartedAt ? `from ${formatTrackingDate(trackingStartedAt)}` : null} secondary={period === "day" ? null : averagesReady ? `${formatAverage(averages.avg_daily_views)} avg. per day` : "— · after 7 days of data"} points={points.map((point) => point.views)} /></Hint>
          <Hint id="insightVisitors"><Stat label="Visitors" value={period === "day" ? formatNumber(currentDayVisitors ?? 0) : averagesReady ? formatAverage(averages.avg_daily_people) : "—"} delta={null} note={period === "day" ? "unique today" : averagesReady ? "avg. per day" : "after 7 days of data"} points={[]} /></Hint>
          <Hint id="insightConversion"><Stat label="Per 100 visits" value={currentConversion !== null ? currentConversion.toFixed(1) : "—"} delta={formatDelta(conversionDelta, previousLabel, true)} note={currentConversion === null && trackingStartedAt ? `from ${formatTrackingDate(trackingStartedAt)}` : null} points={points.map((point) => point.conversion)} /></Hint>
        </div>
        {trendViews.length >= 6 || trendInquiries.length >= 6 ? <div className="admin-insight-trends">{trendViews.length >= 6 ? <AreaTrend points={points} valueKey="views" title="Views over time" valueLabel="views" /> : null}{trendInquiries.length >= 6 ? <AreaTrend points={points} valueKey="inquiries" title="Inquiries over time" valueLabel="inquiries" /> : null}</div> : null}
      </section>

      <section className="admin-insight-block admin-interest-block" aria-labelledby="interest-heading">
        <div className="admin-insights-section-heading"><div><h2 id="interest-heading">Interest</h2><p>Attention that became a direct signal.</p></div><span>{formatNumber(currentInquiryCount)} submitted</span></div>
        <div className="admin-interest-summary"><span>Conversion</span><strong>{currentConversion !== null ? `${currentConversion.toFixed(1)}%` : "—"}</strong><p>{currentConversion !== null ? "of views became inquiries" : trackingStartedAt ? `Available once views cover the period · from ${formatTrackingDate(trackingStartedAt)}` : "Waiting for enough tracking coverage"}</p></div>
      </section>

      <section className="admin-insight-block admin-pieces-block" aria-labelledby="pieces-heading">
        <div className="admin-insights-section-heading"><div><h2 id="pieces-heading">Pieces viewed</h2><p>Which works earned attention, and their share of piece views.</p></div><span>{formatNumber(artworkSummary.piece_views)} piece views</span></div>
        {artworks.length ? <div className="admin-piece-list">{artworks.map((artwork) => { const share = artworkSummary.piece_views > 0 ? (artwork.views / artworkSummary.piece_views) * 100 : 0; return <div className="admin-piece-row" key={artwork.work_id ?? artwork.slug}><div className="admin-piece-label"><strong>{artwork.title}</strong><small>{artwork.slug}</small></div><i><b style={{ width: `${Math.max(3, share)}%` }} /></i><span><strong>{formatNumber(artwork.views)}</strong><small>{formatPercent(share)} share</small></span></div>; })}</div> : <p className="admin-empty-state">No piece views in this period.</p>}
        {artworkSummary.pieces_viewed > 0 ? <p className="admin-insight-footnote">{formatNumber(artworkSummary.pieces_viewed)} piece{artworkSummary.pieces_viewed === 1 ? "" : "s"} viewed · {formatAverage(artworkSummary.views_per_piece ?? 0)} views per piece</p> : null}
      </section>

      <section className="admin-insight-block admin-what-drew-block" aria-labelledby="what-drew-heading">
        <div className="admin-insights-section-heading"><div><h2 id="what-drew-heading">What drew it</h2><p>Pages that brought the most attention into the studio.</p></div><span>Top referrer: {current.top_referrer ?? "Direct / unknown"}</span></div>
        <div className="admin-top-pages-list">{topPages.data?.length ? topPages.data.map((page, index) => <div className="admin-top-page-row" key={page.path}><span title={page.path}>{displayPath(page.path)}</span><i><b style={{ width: `${Math.max(5, (page.views / Math.max(1, topPages.data?.[0]?.views ?? 1)) * 100)}%`, opacity: String(Math.max(.42, 1 - index * .08)) }} /></i><strong>{formatNumber(page.views)}</strong></div>) : <p className="admin-empty-state">No pages in this period.</p>}</div>
      </section>
    </div>
  );
}

function toRpcRange(range: Range) { return { p_from: range.from.toISOString(), p_to: range.to.toISOString() }; }
function emptySummary(): Summary { return { total_views: 0, unique_visitors_today: 0, top_referrer: null, tracked_days: 0 }; }
function emptyArtworkAttention(): ArtworkAttention { return { pieces_viewed: 0, piece_views: 0, piece_unique_viewers: 0, views_per_piece: null }; }
async function getSelection(searchParams: Promise<SearchParams>): Promise<{ period: Period; offset: number }> { const params = await searchParams; const value = params.period; const period = value === "day" || value === "month" ? value : "week"; const parsed = Number.parseInt(params.offset ?? "0", 10); return { period, offset: Number.isFinite(parsed) ? Math.min(0, Math.max(-24, parsed)) : 0 }; }
function getPeriodRange(period: Period, offset: number): Range { const now = new Date(); if (period === "day") { const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset)); return { from: start, to: new Date(start.getTime() + 86400000) }; } if (period === "week") { const start = startOfWeek(now); const from = new Date(start.getTime() + offset * 7 * 86400000); return { from, to: new Date(from.getTime() + 7 * 86400000) }; } const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1)); return { from: start, to: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)) }; }
function getTrendRange(period: Period, current: Range): Range { if (period === "day") return { from: new Date(current.from.getTime() - 14 * 86400000), to: current.to }; if (period === "week") return { from: new Date(current.from.getTime() - 12 * 7 * 86400000), to: current.to }; return { from: new Date(Date.UTC(current.from.getUTCFullYear(), current.from.getUTCMonth() - 11, 1)), to: current.to }; }
function startOfWeek(date: Date) { const day = date.getUTCDay(); const daysSinceMonday = day === 0 ? 6 : day - 1; return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - daysSinceMonday)); }
function periodLabel(period: Period) { return period === "day" ? "Today" : period === "week" ? "This week" : "This month"; }
function periodCurrentLabel(period: Period) { return period === "day" ? "Current day" : period === "week" ? "Current week" : "Current month"; }
function periodOffsetLabel(period: Period, offset: number) { return `${Math.abs(offset)} ${period}${Math.abs(offset) === 1 ? "" : "s"} ago`; }
function previousPeriodLabel(period: Period) { return period === "day" ? "yesterday" : period === "week" ? "last week" : "last month"; }
function rangeLabel(range: Range, period: Period) { const end = new Date(range.to.getTime() - 1); if (period === "day") return formatFullDate(range.from); if (range.from.getUTCFullYear() === end.getUTCFullYear() && range.from.getUTCMonth() === end.getUTCMonth()) return `${formatMonthDay(range.from)}–${end.getUTCDate()} ${end.getUTCFullYear()}`; return `${formatMonthDay(range.from)} ${range.from.getUTCFullYear()}–${formatMonthDay(end)} ${end.getUTCFullYear()}`; }
function formatFullDate(value: Date) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(value); }
function formatMonthDay(value: Date) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(value); }
function formatTrackingDate(value: Date) { return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(value); }
function dateKey(value: Date) { return value.toISOString().slice(0, 10); }
function conversion(inquiries: number, views: number) { return views > 0 ? (inquiries / views) * 100 : null; }
function buildPoints(traffic: TrafficPoint[], inquiries: InquiryPoint[]): Point[] { const points = new Map<string, { views: number; inquiries: number }>(); traffic.forEach((point) => points.set(point.period_start, { views: point.views, inquiries: 0 })); inquiries.forEach((point) => points.set(point.period_start, { views: points.get(point.period_start)?.views ?? 0, inquiries: point.inquiries })); return Array.from(points.entries()).sort(([left], [right]) => left.localeCompare(right)).map(([periodStart, point]) => ({ periodStart, label: formatMonthDay(new Date(`${periodStart}T00:00:00Z`)), views: point.views, inquiries: point.inquiries, conversion: conversion(point.inquiries, point.views) ?? 0 })); }
function displayPath(path: string) { return path === "/" ? "Home" : path === "/shop" ? "Shop" : path === "/about" ? "About" : path; }
function formatNumber(value: number) { return Number(value).toLocaleString("en-PH"); }
function formatAverage(value: number) { return Number(value).toFixed(1); }
function formatPercent(value: number) { return `${Number(value).toFixed(1)}%`; }
function formatDelta(value: number | null, previousLabel: string, decimal: boolean) { if (value === null) return null; const sign = value > 0 ? "+" : value < 0 ? "−" : ""; const amount = decimal ? Math.abs(value).toFixed(1) : formatNumber(Math.abs(value)); return `${sign}${amount} from ${previousLabel}`; }

function Stat({ label, value, delta, note, secondary, points }: { label: string; value: string; delta: string | null; note: string | null; secondary?: string | null; points: number[] }) { return <div className="admin-insight-stat"><span>{label}</span><strong>{value}</strong>{delta ? <small>{delta}</small> : note ? <small>{note}</small> : <small className="is-empty" aria-hidden="true">&nbsp;</small>}{secondary ? <small className="admin-insight-secondary">{secondary}</small> : null}<Sparkline points={points} label={`${label} trend`} /></div>; }
function Sparkline({ points, label }: { points: number[]; label: string }) { const populated = points.filter((value) => value > 0); if (populated.length < 2) return <svg className="admin-sparkline" viewBox="0 0 120 34" role="img" aria-label={label} />; const max = Math.max(1, ...points); const width = 120; const height = 34; const step = width / (points.length - 1); const path = points.map((value, index) => `${index ? "L" : "M"}${(index * step).toFixed(2)},${(height - (value / max) * (height - 3)).toFixed(2)}`).join(" "); const fill = `${path} L ${width},${height} L 0,${height} Z`; const endIndex = points.length - 1; const endValue = points[endIndex] ?? 0; const endX = endIndex * step; const endY = height - (endValue / max) * (height - 3); return <svg className="admin-sparkline" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}><path className="admin-spark-fill" d={fill} /><path d={path} /><circle className="admin-spark-end" cx={endX} cy={endY} r="2.5"><title>{`${label}, ${formatNumber(endValue)}`}</title></circle></svg>; }
function AreaTrend({ points, valueKey, title, valueLabel }: { points: Point[]; valueKey: "views" | "inquiries"; title: string; valueLabel: string }) { const width = 760; const height = 180; const values = points.map((point) => point[valueKey]); const max = Math.max(1, ...values); const xStep = points.length > 1 ? width / (points.length - 1) : width; const coords = points.map((point, index) => ({ x: index * xStep, y: height - (point[valueKey] / max) * (height - 24) })); const line = coords.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" "); const area = `${line} L ${width},${height} L 0,${height} Z`; const peakIndex = values.reduce((best, value, index) => value > values[best] ? index : best, 0); return <div className="admin-area-trend"><h3>{title}</h3><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}, ${points.length} populated periods`}><path className="admin-area-fill" d={area} /><path className="admin-area-line" d={line} /><line className="admin-area-baseline" x1="0" y1={height} x2={width} y2={height} />{coords.map((point, index) => <g className="admin-chart-point" key={points[index].periodStart}><title>{`${points[index].label}: ${formatNumber(values[index])} ${valueLabel}`}</title><line className="admin-chart-crosshair" x1={point.x} y1="0" x2={point.x} y2={height} /><circle cx={point.x} cy={point.y} r="10" />{index === peakIndex || index === coords.length - 1 ? <text x={point.x} y={Math.max(15, point.y - 10)} textAnchor={index === 0 ? "start" : index === coords.length - 1 ? "end" : "middle"}>{formatNumber(values[index])}</text> : null}</g>)}</svg></div>; }
function EmptyState({ kind, message }: { kind: "none" | "period" | "sparse"; message: string }) { return <p className={`admin-insights-empty is-${kind}`} role="status">{message}</p>; }
function AdminMessage({ message }: { message: string }) { return <div className="admin-dashboard"><p className="admin-eyebrow">Studio intelligence</p><h1>Studio insights</h1><p className="admin-muted">{message}</p></div>; }
