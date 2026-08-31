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
type Summary = { total_views: number; unique_visitors_today: number; top_referrer: string | null; tracked_days: number };
type TrafficPoint = { period_start: string; views: number; unique_visitors: number | null };
type InquiryPoint = { period_start: string; inquiries: number };
type Point = { label: string; periodStart: string; views: number; inquiries: number; conversion: number };
type DailyAverages = { covered_days: number; avg_daily_people: number; avg_daily_views: number };
type TrackingStartRpc = (functionName: "get_tracking_started_at", args: Record<string, never>) => Promise<{ data: string | null; error: unknown }>;
type DailyAveragesRpc = (functionName: "get_daily_averages", args: { p_from: string; p_to: string }) => Promise<{ data: DailyAverages[] | null; error: unknown }>;

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

export default async function AdminInsightsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const period = await getPeriod(searchParams);
  const sessionClient = await createClient();
  if (!sessionClient) return <AdminMessage message="Supabase is not configured." />;
  const { data: canViewInsights } = await sessionClient.rpc("is_user_manager");
  if (!canViewInsights) redirect("/studio");

  const admin = createAdminClient();
  if (!admin) return <AdminMessage message="Insights are not configured." />;
  const currentRange = getPeriodRange(period, 0);
  const previousRange = getPeriodRange(period, -1);
  const trendRange = getTrendRange(period);
  const lifetimeTo = new Date();
  const trackingStartRpc = admin.rpc.bind(admin) as unknown as TrackingStartRpc;
  const dailyAveragesRpcFn = admin.rpc.bind(admin) as unknown as DailyAveragesRpc;
  const [currentSummary, previousSummary, currentInquiries, previousInquiries, traffic, inquiries, topPages, lifetime, trackingStart, dailyAveragesResult] = await Promise.all([
    admin.rpc("get_traffic_summary", toRpcRange(currentRange)),
    admin.rpc("get_traffic_summary", toRpcRange(previousRange)),
    admin.rpc("get_inquiry_total", toRpcRange(currentRange)),
    admin.rpc("get_inquiry_total", toRpcRange(previousRange)),
    admin.rpc("get_views_by_period", { p_granularity: period, ...toRpcRange(trendRange) }),
    admin.rpc("get_inquiry_counts_by_period", { p_granularity: period, ...toRpcRange(trendRange) }),
    admin.rpc("get_top_pages", { ...toRpcRange(currentRange), p_limit: 7 }),
    admin.rpc("get_traffic_summary", { p_from: new Date(0).toISOString(), p_to: lifetimeTo.toISOString() }),
    trackingStartRpc("get_tracking_started_at", {}),
    dailyAveragesRpcFn("get_daily_averages", toRpcRange(currentRange)),
  ]);

  if (currentSummary.error || previousSummary.error || currentInquiries.error || previousInquiries.error || traffic.error || inquiries.error || topPages.error || lifetime.error || trackingStart.error || dailyAveragesResult.error) return <AdminMessage message="Insights could not be loaded." />;
  const current = currentSummary.data?.[0] ?? emptySummary();
  const previous = previousSummary.data?.[0] ?? emptySummary();
  const currentInquiryCount = currentInquiries.data ?? 0;
  const previousInquiryCount = previousInquiries.data ?? 0;
  const points = buildPoints((traffic.data ?? []) as TrafficPoint[], (inquiries.data ?? []) as InquiryPoint[]);
  const populatedPoints = points.filter((point) => point.views > 0 || point.inquiries > 0);
  const lifetimeSummary = lifetime.data?.[0] ?? emptySummary();
  const dailyAverages = dailyAveragesResult.data?.[0];
  const averagesReady = period !== "day" && dailyAverages !== undefined && dailyAverages.covered_days >= 7;
  const trackingStartedAt = trackingStart.data ? new Date(trackingStart.data) : null;
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

  return (
    <div className="admin-dashboard admin-operations-page admin-insights-page">
      <p className="admin-eyebrow">Studio intelligence</p>
      <div className="admin-insights-heading">
        <div><h1>Studio insights</h1><p className="admin-muted">A calm read on attention, interest, and what drew it.</p>{trackingStartedAt ? <p className="admin-insights-coverage">Tracking since {formatTrackingDate(trackingStartedAt)} · {formatNumber(lifetimeSummary.tracked_days)} day{lifetimeSummary.tracked_days === 1 ? "" : "s"} of data</p> : null}</div>
        <nav className="admin-period-selector" aria-label="Insight period">
          {PERIODS.map((item) => <Hint id="insightPeriod" key={item.value}><Link className={item.value === period ? "is-selected" : ""} href={`/studio/insights?period=${item.value}`} aria-current={item.value === period ? "page" : undefined}>{item.label}</Link></Hint>)}
        </nav>
      </div>

      {!hasEverTracked ? <EmptyState kind="none" message="Tracking has started. Figures will appear as visitors arrive." /> : !hasPeriodData ? <EmptyState kind="period" message={`No traffic or inquiries in this ${period}.`} /> : populatedPoints.length > 0 && populatedPoints.length < 6 ? <EmptyState kind="sparse" message="Figures are ready. The trend appears after six populated periods." /> : null}

      <section className="admin-insight-block admin-attention-block" aria-labelledby="attention-heading">
        <div className="admin-insights-section-heading"><h2 id="attention-heading">Attention</h2><span>{periodLabel(period)}</span></div>
        <div className="admin-insight-stat-row"><Hint id="insightViews"><Stat label="Views" value={formatNumber(current.total_views)} delta={formatDelta(viewsDelta, previousLabel, false)} note={null} secondary={period === "day" ? null : averagesReady ? `${formatAverage(dailyAverages.avg_daily_views)} avg. per day` : "— after 7 days of data"} points={points.map((point) => point.views)} /></Hint><Hint id="insightVisitors"><Stat label="Visitors" value={period === "day" ? formatNumber(current.unique_visitors_today) : averagesReady ? formatAverage(dailyAverages.avg_daily_people) : "—"} delta={null} note={period === "day" ? null : averagesReady ? "avg. per day" : "after 7 days of data"} points={[]} /></Hint></div>
        {populatedPoints.length >= 6 ? <AreaTrend points={points.filter((point) => point.views > 0)} title="Views over time" /> : null}
      </section>

      <section className="admin-insight-block admin-interest-block" aria-labelledby="interest-heading">
        <div className="admin-insights-section-heading"><h2 id="interest-heading">Interest</h2><span>Is attention turning into conversation?</span></div>
        <div className="admin-insights-hero"><strong>{formatNumber(currentInquiryCount)}</strong><span>inquiries {period === "day" ? "today" : period === "week" ? "this week" : "this month"}</span><small>{formatDelta(inquiryDelta, previousLabel, false) ?? ""}</small></div>
        <div className="admin-insight-stat-row admin-interest-stats"><Hint id="insightConversion"><Stat label="Per 100 visits" value={currentConversion !== null ? currentConversion.toFixed(1) : "—"} delta={formatDelta(conversionDelta, previousLabel, true)} note={currentConversion === null && trackingStartedAt ? `from ${formatTrackingDate(trackingStartedAt)}` : null} points={points.map((point) => point.conversion)} /></Hint></div>
      </section>

      <section className="admin-insight-block admin-what-drew-block" aria-labelledby="what-drew-heading">
        <div className="admin-insights-section-heading"><h2 id="what-drew-heading">What drew it</h2><span>Top referrer: {current.top_referrer ?? "Direct / unknown"}</span></div>
        <div className="admin-top-pages-list">{topPages.data?.length ? topPages.data.map((page, index) => <div className="admin-top-page-row" key={page.path}><span title={page.path}>{displayPath(page.path)}</span><i><b style={{ width: `${Math.max(5, (page.views / Math.max(1, topPages.data?.[0]?.views ?? 1)) * 100)}%`, opacity: String(Math.max(.42, 1 - index * .08)) }} /></i><strong>{formatNumber(page.views)}</strong></div>) : <p className="admin-empty-state">No pages in this period.</p>}</div>
      </section>
    </div>
  );
}

function toRpcRange(range: Range) { return { p_from: range.from.toISOString(), p_to: range.to.toISOString() }; }
function emptySummary(): Summary { return { total_views: 0, unique_visitors_today: 0, top_referrer: null, tracked_days: 0 }; }
async function getPeriod(searchParams: Promise<{ period?: string }>): Promise<Period> { const value = (await searchParams).period; return value === "day" || value === "month" ? value : "week"; }
function getPeriodRange(period: Period, offset: number): Range {
  const now = new Date();
  if (period === "day") { const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset)); return { from: start, to: new Date(start.getTime() + 86400000) }; }
  if (period === "week") { const start = startOfWeek(now); const from = new Date(start.getTime() + offset * 7 * 86400000); return { from, to: new Date(from.getTime() + 7 * 86400000) }; }
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  return { from: start, to: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)) };
}
function getTrendRange(period: Period): Range { const current = getPeriodRange(period, 0); if (period === "day") return { from: new Date(current.from.getTime() - 14 * 86400000), to: current.to }; if (period === "week") return { from: new Date(current.from.getTime() - 12 * 7 * 86400000), to: current.to }; return { from: new Date(Date.UTC(current.from.getUTCFullYear(), current.from.getUTCMonth() - 11, 1)), to: current.to }; }
function startOfWeek(date: Date) { const day = date.getUTCDay(); const daysSinceMonday = day === 0 ? 6 : day - 1; return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - daysSinceMonday)); }
function periodLabel(period: Period) { return period === "day" ? "Today" : period === "week" ? "This week" : "This month"; }
function previousPeriodLabel(period: Period) { return period === "day" ? "yesterday" : period === "week" ? "last week" : "last month"; }
function conversion(inquiries: number, views: number) { return views > 0 ? (inquiries / views) * 100 : null; }
function buildPoints(traffic: TrafficPoint[], inquiries: InquiryPoint[]): Point[] { const inquiryByDate = new Map(inquiries.map((point) => [point.period_start, point.inquiries])); return traffic.map((point) => { const inquiryCount = inquiryByDate.get(point.period_start) ?? 0; return { periodStart: point.period_start, label: formatDate(point.period_start), views: point.views, inquiries: inquiryCount, conversion: conversion(inquiryCount, point.views) ?? 0 }; }); }
function formatDate(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }
function formatTrackingDate(value: Date) { return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(value); }
function displayPath(path: string) { return path === "/" ? "Home" : path === "/shop" ? "Shop" : path === "/about" ? "About" : path; }
function formatNumber(value: number) { return value.toLocaleString("en-PH"); }
function formatAverage(value: number) { return Number(value).toFixed(1); }
function formatDelta(value: number | null, previousLabel: string, decimal: boolean) { if (value === null) return null; const sign = value > 0 ? "+" : value < 0 ? "−" : ""; const amount = decimal ? Math.abs(value).toFixed(1) : formatNumber(Math.abs(value)); return `${sign}${amount} from ${previousLabel}`; }

function Stat({ label, value, delta, note, secondary, points }: { label: string; value: string; delta: string | null; note: string | null; secondary?: string | null; points: number[] }) { return <div className="admin-insight-stat"><span>{label}</span><strong>{value}</strong>{delta ? <small>{delta}</small> : note ? <small>{note}</small> : <small className="is-empty" aria-hidden="true">&nbsp;</small>}{secondary ? <small>{secondary}</small> : null}<Sparkline points={points} label={`${label} trend`} /></div>; }
function Sparkline({ points, label }: { points: number[]; label: string }) { const populated = points.filter((value) => value > 0); if (populated.length < 2) return <svg className="admin-sparkline" viewBox="0 0 120 34" role="img" aria-label={label} />; const max = Math.max(1, ...points); const width = 120; const height = 34; const step = width / (points.length - 1); const path = points.map((value, index) => `${index ? "L" : "M"}${(index * step).toFixed(2)},${(height - (value / max) * (height - 3)).toFixed(2)}`).join(" "); const fill = `${path} L ${width},${height} L 0,${height} Z`; const endIndex = points.length - 1; const endValue = points[endIndex]; const endX = endIndex * step; const endY = height - (endValue / max) * (height - 3); return <svg className="admin-sparkline" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}><path className="admin-spark-fill" d={fill} /><path d={path} /><circle className="admin-spark-end" cx={endX} cy={endY} r="2.5"><title>{`${label}, ${formatNumber(endValue)}`}</title></circle></svg>; }
function AreaTrend({ points, title }: { points: Point[]; title: string }) { const width = 760; const height = 180; const max = Math.max(1, ...points.map((point) => point.views)); const xStep = points.length > 1 ? width / (points.length - 1) : width; const coords = points.map((point, index) => ({ x: index * xStep, y: height - (point.views / max) * (height - 24) })); const line = coords.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" "); const area = `${line} L ${width},${height} L 0,${height} Z`; const peakIndex = points.reduce((best, point, index) => point.views > points[best].views ? index : best, 0); return <div className="admin-area-trend"><h3>{title}</h3><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}, ${points.length} populated periods`}><path className="admin-area-fill" d={area} /><path className="admin-area-line" d={line} /><line className="admin-area-baseline" x1="0" y1={height} x2={width} y2={height} />{coords.map((point, index) => <g className="admin-chart-point" key={points[index].periodStart}><title>{`${points[index].label}: ${formatNumber(points[index].views)} views`}</title><line className="admin-chart-crosshair" x1={point.x} y1="0" x2={point.x} y2={height} /><circle cx={point.x} cy={point.y} r="10" />{index === peakIndex || index === coords.length - 1 ? <text x={point.x} y={Math.max(15, point.y - 10)} textAnchor={index === 0 ? "start" : index === coords.length - 1 ? "end" : "middle"}>{formatNumber(points[index].views)}</text> : null}</g>)}</svg></div>; }
function EmptyState({ kind, message }: { kind: "none" | "period" | "sparse"; message: string }) { return <p className={`admin-insights-empty is-${kind}`} role="status">{message}</p>; }
function AdminMessage({ message }: { message: string }) { return <div className="admin-dashboard"><p className="admin-eyebrow">Studio intelligence</p><h1>Studio insights</h1><p className="admin-muted">{message}</p></div>; }
