# CODEX BRIEF — studio insights: traffic and inquiries

Repo: `~/Documents/AVINTELLIGENCE/ChromaFairy/site`
Target page: `/studio/insights`

Replace the sales panel with two things Samantha can actually act on:
**page visits** and **inquiry counts**, each by day / week / month.

The sales panel shows demo figures for a flow that does not run yet, on a
live client site. Remove it — do not leave it behind a toggle.

## Scope

This does NOT touch: the shop, the landing page, the inquiries table or
inbox, the record/booking model, auth, or any other studio page.

---

## 1. Migration — `page_views`

```sql
create table public.page_views (
  id           uuid primary key default gen_random_uuid(),
  path         text not null,
  referrer     text,
  visitor_hash text not null,
  created_at   timestamptz not null default now()
);
create index page_views_created_idx on public.page_views (created_at desc);
create index page_views_path_created_idx on public.page_views (path, created_at desc);
create index page_views_visitor_day_idx on public.page_views (visitor_hash, created_at desc);
```

**Security — this is the part to get right.**

RLS enabled. **No anon or authenticated policy of any kind.** No grants to
anon or authenticated. Service role only.

Inserts happen exclusively through the server API route below, using the
service-role client. A public table with a permissive insert policy is
exactly the hole we closed on `inquiries` — do not recreate it here.

Unique migration version number. Never run `db push`.

## 2. Ingest route — `app/api/track/route.ts`

POST, public, no auth. Inserts via `createAdminClient()`.

Rules:

- **Never store an IP address or user-agent.** Compute
  `visitor_hash = sha256(ip + user_agent + daily_salt)` and store only the
  hash. `daily_salt` is a server-side secret combined with the current UTC
  date, so the hash rotates every day. That gives daily unique counts and
  makes cross-day tracking impossible by construction — a deliberate
  privacy property, not an oversight.
- **Reject anything not from this site.** `path` must start with `/`, be
  under 200 characters, and contain no protocol. Truncate `referrer` at 300.
- **Drop obvious bots** by user-agent before inserting (`bot`, `crawler`,
  `spider`, `preview`, `headless`, `lighthouse`). Do not store them.
- **Do not track `/studio/*`.** That is Samantha's own admin traffic and
  would pollute her numbers.
- Return 204 with no body, always. Never leak errors to the caller, never
  let a tracking failure surface to a visitor.
- Bound the request body; reject anything over a few hundred bytes.

## 3. Client hook

Fire once per route change on public pages. Use `navigator.sendBeacon`
where available, falling back to `fetch` with `keepalive`.

- Do not fire on `/studio/*`
- Do not block rendering or delay navigation
- Respect `navigator.doNotTrack`
- Fire once per path per navigation — no duplicates on re-render

## 4. Aggregation — SQL functions, not JavaScript

**All aggregation happens in Postgres.** Do not fetch rows and total them in
JS; that pattern silently truncates and returns wrong numbers as data grows.

Each function: `stable security definer`, `set search_path = public`,
executable by `service_role` only.

```
get_traffic_summary(p_from timestamptz, p_to timestamptz)
  -> total_views, unique_visitors_today, top_referrer, tracked_days

get_views_by_period(p_granularity text, p_from timestamptz, p_to timestamptz)
  -> period_start date, views bigint, unique_visitors bigint

get_top_pages(p_from timestamptz, p_to timestamptz, p_limit int default 10)
  -> path text, views bigint
  (order by views desc; remainder collapsed into a single 'Other' row so
   totals reconcile)

get_inquiry_counts_by_period(p_granularity text, p_from timestamptz, p_to timestamptz)
  -> period_start date, inquiries bigint
```

`p_granularity` accepts `'day' | 'week' | 'month'` and uses `date_trunc`.
Return `period_start` as a date so it sorts correctly — never a formatted
string.

**Be honest about uniques.** Because the salt rotates daily, unique visitors
are only meaningful per day. For week and month, report **views**, and label
unique columns as daily-only or omit them. Do not sum daily uniques across a
week and present it as weekly uniques — that number would be wrong.

## 5. The page

`/studio/insights`, matching the existing studio design language — serif
headings, warm cream ground, existing type scale. No new component library,
no new colours, no new dependencies.

- Period selector: day / week / month
- Two headline numbers: page views and inquiries for the selected period
- A simple trend for each over the period
- Top pages list
- Empty state that says which state it is in: *no traffic recorded yet*
  versus *no traffic in this period*. Those are different and Samantha
  should never have to guess which.
- Mobile: stacks cleanly. She will read this on a phone.

## Verification — report each

1. Visit a public page; a row appears in `page_views` with a hash, no IP,
   no user-agent
2. Visit `/studio/inquiries`; **no** row is recorded
3. A request with a bot user-agent records nothing
4. Two visits from the same browser on the same day share a `visitor_hash`
5. Anon cannot select or insert into `page_views` directly — confirm the
   REST endpoint refuses
6. The insights page renders correct day / week / month figures against
   real rows
7. Inquiry counts match `select count(*) from inquiries` for the same window
8. `pnpm build`, `pnpm lint`, `pnpm exec tsc --noEmit` pass
9. Open the deployed preview yourself is NOT possible — Andrew verifies
   visually

## Note

`page_views` grows without bound. At this site's volume that is fine for
years, but add a line to the migration comment recording that rows older
than 12 months should eventually be pruned or rolled up.

## Standing rules

- No browser driving, no network probing, no permission escalation.
  Unavailable tool -> report and stop.
- Never run `db push`.
- No client-side `supabaseAdmin`.
- Build before push.
- Conflict with the codebase -> stop and say so.
