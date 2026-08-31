# CODEX BRIEF — studio insights v2: metrics and design

Repo: `~/Documents/AVINTELLIGENCE/ChromaFairy/site`
Page: `/studio/insights`. Revises the version just built.

The data layer is correct and stays. This changes **what is shown** and
**how it looks**. No new migration is required — period comparison is done
by calling the existing functions twice with different windows.

Scope: this page only. Does not touch the shop, landing page, inquiries
inbox, tracking route, or SQL functions.

---

# PART A — What to show

## The problem with the current version

Two raw counts side by side do not answer Samantha's actual questions.
"47 views" means nothing without "up from what?" And views and inquiries
sitting apart never answer the only question that matters: **is the site
turning attention into interest?**

## 1. Conversion is the headline, not a footnote

Add a third figure: **inquiries per 100 views** for the selected period.

Views alone are vanity. Inquiries alone lack context. Fifteen views and two
inquiries is a good week; four hundred views and zero inquiries means
something on the page is wrong. Neither is visible from two separate counts.

Measure against **views**, not unique visitors — uniques are only meaningful
daily under the rotating-salt design, and a metric that changes meaning by
period is worse than a simpler one. Label it plainly: "per 100 visits".

## 2. Comparison, not averages

**Do not add daily averages.** At this traffic they read as "2.3 views per
day", which is technically true and useless.

Instead, every headline figure carries a **change against the immediately
preceding period of the same length**: this week vs last week, this month vs
last month.

Implement by calling the existing RPCs twice — once for the current window,
once for the previous window of equal length — and computing the delta in the
route. No SQL change.

Show as: the number, then beneath it `+12 from last week` or
`−4 from last week`. When there is no previous period with data, show
nothing rather than a misleading `+100%`.

## 3. Default to weekly

Daily at this volume is mostly zeros with occasional ones, which looks broken
even when it is working. Weekly is the default; day and month remain
available.

## 4. Do not draw a chart until there is something to draw

Below **6 periods with data**, show the figures and omit the trend entirely.
A three-point line is misleading decoration. When it appears, it is a simple
bar per period — no axes clutter, no gridlines, value on hover.

## 5. Sections, in this order

1. **Attention** — views, with change
2. **Interest** — inquiries and conversion, with change
3. **What drew it** — top pages, and top referrer

That is the order she thinks in: how many came, did they care, what pulled
them.

---

# PART B — How it should look

This is an artist's studio, not an analytics console. It should feel like
part of chromafairy.com — warm, calm, editorial — and never like a SaaS
dashboard dropped into her site.

## Type carries the data

Headline figures are **large serif numerals**, using the existing display
face at a size that makes them the clear focus — this is the one place on
the page where scale is dramatic. Labels beneath in the existing small-caps
or letter-spaced style, quiet and secondary. Deltas smaller still.

No number lives inside a bordered card. Whitespace separates the figures,
not boxes. The existing studio pages already read as documents rather than
widgets — match that.

## Chroma effects — ambient, never on the data

Keep the site's character, but **motion and effects stay behind and around
the content, never on it**:

- The ambient wave / gradient may sit behind the page header at low opacity
- Magic-dust or shimmer may appear on hover of the period selector
- **Never** animate, shimmer, or overlay a number, a delta, or a chart bar
- Nothing that moves while she is trying to read a figure
- Respect `prefers-reduced-motion` — all ambient motion stops

A number that shimmers is a number she has to wait to read. The effects earn
their place in the margins; the data is still.

## Restraint in colour

Use the existing warm palette. **One accent only**, for the current period
and positive deltas. Negative deltas are the same weight in the body colour,
not red — this is her own small business and an alarm colour for a quiet
week is the wrong emotional register.

Charts use a single tone with opacity variation, not a palette. There is one
series; it needs one colour.

## Sparse data must look intentional

The empty and near-empty states are the ones she will see first, so design
them first, not last:

- **No data at all**: a calm line explaining tracking has started and figures
  will appear as visitors arrive. Gentle dust motif is appropriate here.
- **No data this period**: says so explicitly, and distinguishes itself from
  the above. She should never wonder which state she is in.
- **One or two periods**: figures shown, chart absent, and nothing looks
  broken by its absence.

## Mobile

She will read this on a phone. Figures stack, remain large, and the period
selector stays reachable with a thumb. Top pages truncate gracefully rather
than wrapping into a mess.

## Constraints

- Existing studio design language: serif headings, warm cream ground,
  established type scale
- No new component library, no new dependencies, no new colours
- If a chart is needed, hand-rolled SVG or CSS — do not add a charting
  library for one bar series

---

## Verification

- Weekly is the default period
- Conversion appears as inquiries per 100 visits, labelled
- Each figure shows change vs the previous equal-length period, and shows
  nothing when there is no prior data
- No chart below 6 periods with data
- Nothing animates on or over a number
- `prefers-reduced-motion` stops all ambient motion
- The three empty states are visibly different from each other
- Renders correctly on a phone
- `pnpm build`, `pnpm lint`, `pnpm exec tsc --noEmit` pass

Andrew verifies visually — you do not open a browser.

## Standing rules

No browser driving, no network probing, no permission escalation. Never run
`db push`. No client-side `supabaseAdmin`. Build before push. Conflict with
the codebase -> stop and say so.
