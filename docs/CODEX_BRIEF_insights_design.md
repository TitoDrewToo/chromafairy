# CODEX BRIEF — studio insights: visual design

Repo: `~/Documents/AVINTELLIGENCE/ChromaFairy/site`
Page: `/studio/insights` (`app/studio/(protected)/insights/page.tsx`)

Supersedes the design half of `CODEX_BRIEF_studio_insights_v2.md`. The
metric decisions in that brief stand (weekly default, period comparison,
conversion, chart threshold). This replaces how it looks.

---

## The diagnosis — it is not a layout problem

The page reads dead because the marks are **literally almost invisible**.
Measured contrast of the current brand colours against the cream studio
ground `#fbfaf7`:

| Colour | Contrast | Verdict |
|---|---|---|
| `#e4b84f` light gold | **1.79 : 1** | invisible |
| `#ff66c4` chroma pink | **2.53 : 1** | fails |
| `#b99653` gold | **2.66 : 1** | fails |

The floor for a data mark is **3 : 1**. Everything currently drawn is below
it. No amount of layout fixes a mark the eye cannot resolve.

Second problem: bare counts. A number with no comparison carries no
information. "47" tells Samantha nothing. The fix is a **stat tile** — value,
delta, and a small trend — not a bigger number.

## The palette — one validated hue

**Data mark colour: `#a16207`.**

It is the same hue family as the existing brand gold, stepped darker and
properly saturated. Validated against the cream surface: lightness band
PASS, chroma floor PASS, contrast PASS.

Rules:

- **`#a16207` is the only colour used for data.** Every chart on this page
  is single-series, so there is no categorical palette and no legend.
- Magnitude uses **opacity steps of that one hue**, never additional hues.
- The existing brand golds (`#b99653`, `#e4b84f`) and chroma pink
  (`#ff66c4`) remain for chrome, borders, and ambient decoration — **never
  for a data mark**. They fail contrast.
- De-emphasis / context marks: a neutral gray from the existing `--line`
  family, never a faded gold.
- **Text never wears the mark colour.** Values, labels and captions stay in
  `--ink` and its muted steps. A small coloured mark beside a label carries
  identity; the text does not.

## Form — what each number becomes

### Hero figure: inquiries

One number leads the page, at 48px or larger: **inquiries in the selected
period**. That is what Samantha opens this page to learn — did anyone want
to talk to me. Views explain it; inquiries are the outcome.

Beneath it, in small text: the change against the previous equal period.

### KPI row: three stat tiles

Views · Inquiries · Conversion (per 100 visits). Each tile is:

```
LABEL           (small caps, muted)
   47           (large, ink, tabular numerals)
   +12 from last week   (small, muted — never red on a decrease)
   ▁▂▃▅▂▃▇      (sparkline, #a16207, 2px, no axes)
```

The sparkline is the piece that makes a stat tile feel alive rather than
dead. It carries shape without demanding a chart.

**Tabular numerals** (`font-variant-numeric: tabular-nums`) on every figure
so numbers do not jitter between periods.

### Trend: a single area, emphasis form

One series, `#a16207`, 2px line with a low-opacity fill beneath. No legend —
the title names it. No gridlines beyond a single baseline. Direct-label only
the peak and the current value, never every point.

Appears only at **6 or more populated periods**, per the metric brief.

### Top pages: horizontal bars

Long path names, so horizontal. Sequential — one hue, opacity by magnitude.
Direct value labels at the end of each bar. 4px rounded data-ends anchored
to the baseline, 2px gap between bars.

More than 7 rows → fold the tail into a single "Other" row rather than
adding more bars.

## Layout — hierarchy answers three questions in order

```
  Studio insights                          [ day | week | month ]

  ─────────────────────────────────────────────────────────────
        6                    inquiries this week
        +2 from last week
  ─────────────────────────────────────────────────────────────

  VIEWS            INQUIRIES         PER 100 VISITS
  47               6                 12.8
  +12              +2                +1.4
  ▁▂▃▅▂▃▇          ▁▁▂▁▃▁▂           ▁▂▂▃▂▄▃

  ─────────────────────────────────────────────────────────────
  [ trend area chart — only at >= 6 periods ]

  ─────────────────────────────────────────────────────────────
  TOP PAGES
  /shop/tidal-bloom     ████████████  18
  /                     ████████       12
  /commission           █████          7
```

Whitespace separates sections, not boxes and borders. The existing studio
pages read as documents rather than widget grids — match that. No card
borders around figures.

## Interaction

- **Hover is not optional.** Sparklines and the trend chart get a crosshair
  and tooltip showing period and value. Bars get a per-bar tooltip.
- Hit targets larger than the marks themselves.
- The period selector sits in one row above everything, top right.
- Respect `prefers-reduced-motion`: no transitions on chart draw.

## Do not

- **No dual axis.** Views and inquiries have different scales — that is two
  tiles or two charts, never two y-scales on one plot. This is the single
  most common dashboard mistake.
- **No pie or donut**, including for top pages.
- **No colour per series.** There are no series to tell apart.
- **No red for a decrease.** This is her own small business; an alarm colour
  for a quiet week is the wrong register. Same weight, muted ink.
- **No number on every data point.** Selective direct labels only.
- **No chart library.** Hand-rolled SVG. One area, one bar set, three
  sparklines — a dependency is not justified.
- **Nothing animated on or over a figure.** Ambient motion stays behind the
  header, per the previous brief.

## Verification

- Every data mark measures >= 3:1 against `#fbfaf7`
- No colour appears in a chart other than `#a16207`, its opacity steps, and
  neutral gray
- Figures use tabular numerals and do not shift width between periods
- Sparklines render at small sizes without clipping
- Hover works on every chart, with hit targets larger than the marks
- Trend chart absent below 6 populated periods, and its absence looks
  intentional
- The three empty states remain visibly distinct
- Renders correctly on a phone; figures stay large, bars truncate cleanly
- `pnpm build`, `pnpm lint`, `pnpm exec tsc --noEmit` pass

Andrew verifies visually. Do not open a browser.

## Standing rules

No browser driving, no network probing, no permission escalation. Never run
`db push`. No client-side `supabaseAdmin`. Build before push. Conflict with
the codebase -> stop and say so.
