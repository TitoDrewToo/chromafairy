# Codex brief — studio insights: accuracy and coverage

The presentation is now right. The **arithmetic** is also right. What is wrong is
that several figures are computed over a window the underlying data does not
cover, which produces confident nonsense rather than an error.

This is the defect class that destroys trust in a client-facing dashboard, so
treat it as correctness work, not polish.

## The facts (verified against production, 2026-08-31)

| | value |
|---|---|
| view tracking began | `2026-08-31 00:43:42 UTC` |
| views, lifetime | 2 |
| tracked days | 1 |
| first inquiry | `2026-08-05` |
| inquiries in August | 9 |

"Per 100 visits: 450.0" is `9 / 2 * 100`. The numerator spans 26 days. The
denominator spans four hours. Both halves are correct; the ratio is meaningless.

**The rule this establishes, which applies to every metric we build from here on:
a figure may only be displayed over a window that its own data covers. If the
window starts before collection did, the figure is suppressed and the reason is
stated.** Do not silently substitute zero for "not yet collected" — a zero is a
measurement, and we did not make one.

---

## D1 — Ratios computed across the tracking boundary (the important one)

`conversion()` divides an inquiry count by a view count without checking whether
the two series cover the same span.

Add a coverage source. New migration, normal naming:

```sql
create or replace function public.get_tracking_started_at()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$ select min(created_at) from public.page_views; $$;

revoke all on function public.get_tracking_started_at() from public, anon, authenticated;
grant execute on function public.get_tracking_started_at() to service_role;
```

In the page, fetch it alongside the other RPCs and derive:

```ts
const trackingStartedAt = trackingStart.data ? new Date(trackingStart.data) : null;
const viewsCoverCurrentPeriod =
  trackingStartedAt !== null && trackingStartedAt <= currentRange.from;
```

Then:

- `currentConversion` / `previousConversion` / `conversionDelta` are computed
  **only** when the respective period is fully covered. Otherwise `null`, and the
  tile renders `—` with the delta line replaced by
  `"from ${formatDate(trackingStartedAt)}"` so the reader knows when it starts
  working rather than thinking it is broken.
- The same gate applies to `viewsDelta`: comparing this period against a previous
  period that predates tracking is not a decline, it is an absence.

## D2 — Single-point sparklines render as a descending wedge

This is the triangle in every tile. With one populated period, `points.length === 1`,
so `step = width`, the line path is a lone `M` command with nothing to draw, and
`fill` still closes `… L 120,34 L 0,34 Z` — a filled right triangle sloping down.

It reads unmistakably as "this is falling." Nothing is falling. There is one
observation.

In `Sparkline()`, return an empty `<svg>` (preserving layout height) when
`points.filter(v => v > 0).length < 2`. Guard the fill on the same condition, not
just on `path` being truthy — `path` is truthy for a single point.

While there: `points[endIndex]` is read without a guard in the `<title>`. Harmless
today because the length is checked first, but make it explicit.

## D3 — The hero and the tile below it print the same number

`9 inquiries this month` sits directly above a tile reading `INQUIRIES 9`. The
hero exists to make one figure dominant; repeating it 80px lower spends the
reader's attention twice on one fact.

Remove the `Inquiries` **tile**. Keep the hero. The stat row under it then carries
`Per 100 visits` alone until per-piece data gives it a companion — a single tile in
that row is fine and better than a duplicated one.

## D4 — Top pages show raw paths

`/` is engineering output. Map known paths to names — `/` → `Home`, `/shop` →
`Shop`, `/about` → `About` — and render `/shop/<slug>` as the work's title once
the per-artwork panel lands. Keep the raw path in the existing `title` attribute.

## D5 — The coverage caveat is buried

`1 tracked day` currently sits in the *What drew it* section header, three
screens down. It is the single most important qualifier on the page: it is the
reason every figure above it should be read cautiously.

Move it into the page header area, beside the period selector or directly under
the subtitle, as plain text: `Tracking since 31 Aug · 1 day of data`. Once
coverage exceeds one full period it can fade to the muted treatment; while
coverage is partial it should be visible without scrolling.

---

## Not for you to fix — questions for Andrew, report only

1. **Test inquiries in the count.** Of the 9 August inquiries, 6 are archived and
   5 are `closed` between Aug 5–16. Some are believed to be our own tests. A
   client dashboard counting our test submissions as her demand signal is wrong
   data. Do not filter anything — report the breakdown and let Andrew decide
   whether archived-and-closed should be excluded, or whether the test rows
   should be deleted.
2. **Sidebar says `Inquiries (1)`, dashboard says `9`.** Probably correct — one
   unarchived-and-new versus nine received this month — but confirm the two
   labels make that distinction legible to Samantha, who will read them as
   contradicting each other.

## Verification

- `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`
- With production data as it stands today, confirm: `Per 100 visits` renders `—`
  with a "from 31 Aug" note, **not** `450.0`; no tile shows a wedge; the header
  shows the tracking-since line; `/` reads `Home`.
- Do not seed or mock data to make the page look populated. The sparse state is
  the state, and it must be correct in that state.
