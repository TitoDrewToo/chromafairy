import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { createClient } from "../../../../lib/supabase/server";
import { Hint } from "../../../../components/studio-hint";
import "../../admin.css";
import "../../operations.css";

export const dynamic = "force-dynamic";

type Period = "day" | "week" | "month";
type Range = { from: Date; to: Date; label: string };
type TrafficPoint = { period_start: string; views: number; unique_visitors: number | null };
type InquiryPoint = { period_start: string; inquiries: number };

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
  const range = getRange(period);
  const now = new Date();
  const [{ data: summary, error: summaryError }, { data: lifetime, error: lifetimeError }, { data: traffic, error: trafficError }, { data: inquiries, error: inquiriesError }, { data: inquiryTotal, error: inquiryTotalError }, { data: topPages, error: pagesError }] = await Promise.all([
    admin.rpc("get_traffic_summary", { p_from: range.from.toISOString(), p_to: range.to.toISOString() }),
    admin.rpc("get_traffic_summary", { p_from: new Date(0).toISOString(), p_to: now.toISOString() }),
    admin.rpc("get_views_by_period", { p_granularity: period, p_from: range.from.toISOString(), p_to: range.to.toISOString() }),
    admin.rpc("get_inquiry_counts_by_period", { p_granularity: period, p_from: range.from.toISOString(), p_to: range.to.toISOString() }),
    admin.rpc("get_inquiry_total", { p_from: range.from.toISOString(), p_to: range.to.toISOString() }),
    admin.rpc("get_top_pages", { p_from: range.from.toISOString(), p_to: range.to.toISOString(), p_limit: 8 }),
  ]);

  if (summaryError || lifetimeError || trafficError || inquiriesError || inquiryTotalError || pagesError) return <AdminMessage message="Insights could not be loaded." />;
  const current = summary?.[0] ?? { total_views: 0, unique_visitors_today: 0, top_referrer: null, tracked_days: 0 };
  const hasEverTracked = (lifetime?.[0]?.total_views ?? 0) > 0;
  const hasPeriodTraffic = current.total_views > 0;
  const trafficPoints = (traffic ?? []) as TrafficPoint[];
  const inquiryPoints = (inquiries ?? []) as InquiryPoint[];
  const maxViews = Math.max(1, ...trafficPoints.map((point) => point.views));
  const maxInquiries = Math.max(1, ...inquiryPoints.map((point) => point.inquiries));

  return (
    <div className="admin-dashboard admin-operations-page admin-insights-page">
      <p className="admin-eyebrow">Studio intelligence</p>
      <div className="admin-insights-heading">
        <div><h1>Studio insights</h1><p className="admin-muted">A quiet read on who is finding the work and raising a hand.</p></div>
        <nav className="admin-period-selector" aria-label="Insight period">
          {PERIODS.map((item) => <Hint id="insightPeriod" key={item.value}><Link className={item.value === period ? "is-selected" : ""} href={`/studio/insights?period=${item.value}`} aria-current={item.value === period ? "page" : undefined}>{item.label}</Link></Hint>)}
        </nav>
      </div>
      <p className="admin-insights-range">{range.label} · {period === "day" ? "Daily unique visitors are available" : "Unique visitors are daily-only"}</p>
      {!hasEverTracked ? <EmptyState message="No traffic recorded yet." /> : !hasPeriodTraffic ? <EmptyState message="No traffic in this period." /> : null}
      <div className="admin-metric-grid admin-insights-metrics"><Hint id="insightViews"><Metric label="Page views" value={formatNumber(current.total_views)} /></Hint><Hint id="insightInquiries"><Metric label="Inquiries" value={formatNumber(inquiryTotal ?? 0)} /></Hint></div>
      <div className="admin-insights-context"><span>{formatNumber(current.unique_visitors_today)} unique visitors today</span><span>{formatNumber(current.tracked_days)} tracked day{current.tracked_days === 1 ? "" : "s"}</span><span>Top referrer: {current.top_referrer ?? "Direct / unknown"}</span></div>
      <div className="admin-insights-trends">
        <Hint id="insightTrends"><Trend title="Page views" points={trafficPoints.map((point) => ({ label: formatDate(point.period_start), value: point.views, detail: period === "day" && point.unique_visitors !== null ? `${point.unique_visitors} daily unique visitors` : `${point.views} views` }))} max={maxViews} /></Hint>
        <Hint id="insightTrends"><Trend title="Inquiries" points={inquiryPoints.map((point) => ({ label: formatDate(point.period_start), value: point.inquiries, detail: `${point.inquiries} inquiries` }))} max={maxInquiries} /></Hint>
      </div>
      <section className="admin-insight-section admin-top-pages-section"><Hint id="insightTopPages"><h2>Top pages</h2></Hint>{topPages?.length ? <div className="admin-insight-table">{topPages.map((page) => <div className="admin-insight-row" key={page.path}><span>{page.path}</span><b>{formatNumber(page.views)} view{page.views === 1 ? "" : "s"}</b></div>)}</div> : <p className="admin-empty-state">No pages in this period.</p>}</section>
    </div>
  );
}

async function getPeriod(searchParams: Promise<{ period?: string }>): Promise<Period> { const value = (await searchParams).period; return value === "week" || value === "month" ? value : "day"; }
function getRange(period: Period): Range {
  const now = new Date();
  if (period === "day") { const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)); return { from: new Date(to.getTime() - 14 * 86400000), to, label: "Last 14 days" }; }
  if (period === "week") { const currentMonday = startOfWeek(now); return { from: new Date(currentMonday.getTime() - 12 * 7 * 86400000), to: new Date(currentMonday.getTime() + 7 * 86400000), label: "Last 12 weeks" }; }
  const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { from: new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() - 11, 1)), to: new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() + 1, 1)), label: "Last 12 months" };
}
function startOfWeek(date: Date) { const day = date.getUTCDay(); const daysSinceMonday = day === 0 ? 6 : day - 1; return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - daysSinceMonday)); }
function formatNumber(value: number) { return value.toLocaleString("en-PH"); }
function formatDate(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }
function Metric({ label, value }: { label: string; value: string }) { return <div className="admin-metric"><span>{label}</span><strong>{value}</strong></div>; }
function Trend({ title, points, max }: { title: string; points: Array<{ label: string; value: number; detail: string }>; max: number }) { return <section className="admin-trend-card"><h2>{title} trend</h2>{points.length ? <div className="admin-trend-list" aria-label={`${title} by period`}>{points.map((point) => <div className="admin-trend-row" key={`${title}-${point.label}`}><span className="admin-trend-label">{point.label}</span><span className="admin-trend-track"><span className="admin-trend-bar" style={{ width: `${Math.max(point.value ? 4 : 0, (point.value / max) * 100)}%` }} /></span><b title={point.detail}>{formatNumber(point.value)}</b></div>)}</div> : <p className="admin-empty-state">No {title.toLowerCase()} in this period.</p>}</section>; }
function EmptyState({ message }: { message: string }) { return <p className="admin-insights-empty" role="status">{message}</p>; }
function AdminMessage({ message }: { message: string }) { return <div className="admin-dashboard"><p className="admin-eyebrow">Studio intelligence</p><h1>Studio insights</h1><p className="admin-muted">{message}</p></div>; }
