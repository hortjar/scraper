# Design System — "Signal"

Two surfaces with one identity: a **landing page** that sells the product and a
**management console** that runs it. They share tokens, type, and one signature
device, so the console feels like the thing the landing page promised.

## 1. The idea

A scraper's life is 99% _nothing changed_ and 1% _something did_. That asymmetry is
the design: a calm, quiet field where color means something, punctuated by rare,
loud events. The product's most characteristic artifact is the **diff** and its
most characteristic rhythm is the **tick** — so those, not a stat card, are what
the design is built from.

Two rules keep it colorful without becoming noisy:

1. **Chrome is monochrome, content is chromatic.** Surfaces, borders, and body text
   come from one neutral ramp. Color appears only where it carries meaning: status,
   direction of change, channel identity, chart series, and the single brand accent
   on primary actions. A colorful sidebar is noise; a colorful data column is information.
2. **Machine text is mono, human text is sans.** Anything the scraper saw — URLs,
   selectors, extracted values, diffs, timestamps, IDs, payloads — is set in mono.
   Anything a person wrote is sans. The typographic split does the work that
   labels and boxes would otherwise have to.

## 2. Color

Authored in OKLCH for perceptually even ramps, emitted as CSS custom properties.
Hex values below are the reference anchors.

### Neutrals — the ground

| Token              | Light     | Dark      | Use                |
| ------------------ | --------- | --------- | ------------------ |
| `--bg`             | `#F6F7F5` | `#0E1418` | Page               |
| `--surface`        | `#FFFFFF` | `#151D22` | Cards, panels      |
| `--surface-raised` | `#FFFFFF` | `#1B252B` | Popovers, dialogs  |
| `--border`         | `#E3E5E1` | `#243037` | Hairlines          |
| `--text`           | `#111A1E` | `#EDF1F0` | Primary            |
| `--text-muted`     | `#5C6B72` | `#94A5AC` | Secondary          |
| `--text-subtle`    | `#8A979D` | `#6B7C84` | Tertiary, metadata |

The dark ground is a desaturated blue-green near-black — terminal-adjacent without
being pure black, so shadows and elevation still read.

### Brand & semantics

| Token          | Hex                   | Meaning                                         |
| -------------- | --------------------- | ----------------------------------------------- |
| `--brand`      | `#6D4AFF`             | Primary actions, focus, the product's own color |
| `--brand-soft` | `#EDE9FF` / `#241B4D` | Brand tint backgrounds                          |
| `--positive`   | `#2E9E5B`             | Added content, value increased, run recovered   |
| `--negative`   | `#E5484D`             | Removed content, value decreased, run failed    |
| `--warning`    | `#F5A524`             | Degraded, throttled, approaching a limit        |
| `--info`       | `#4C6FFF`             | Neutral system notices                          |

`--positive`/`--negative` do double duty for diffs and for delta direction — one
green, one red, everywhere. A second green would be noise.

> Direction is never encoded by color alone: every delta carries an arrow glyph and
> a sign, every status carries an icon and a word. WCAG 2.2 AA, and it also survives
> a screenshot pasted into Slack.

### The Signal ramp — categorical color

Eight hues at matched OKLCH lightness and chroma, so no series shouts louder than
another. Used for channel identity, tags, and chart series — assigned by stable
hash, never randomly, so a channel keeps its color forever.

| #   | Token           | Hex       |
| --- | --------------- | --------- |
| 1   | `--sig-violet`  | `#6D4AFF` |
| 2   | `--sig-indigo`  | `#4C6FFF` |
| 3   | `--sig-cyan`    | `#00A6C0` |
| 4   | `--sig-teal`    | `#12A594` |
| 5   | `--sig-lime`    | `#7FB800` |
| 6   | `--sig-amber`   | `#F5A524` |
| 7   | `--sig-coral`   | `#F04E5C` |
| 8   | `--sig-magenta` | `#D6409F` |

Each has `-soft` (background tint) and `-ink` (text-on-tint) variants generated at
build time. Charts follow [the dataviz conventions](./04-FRONTEND.md#9-charts).

## 3. Typography

| Role      | Face                                        | Weights         | Where                                       |
| --------- | ------------------------------------------- | --------------- | ------------------------------------------- |
| Display   | **Archivo Expanded** (variable, width axis) | 700 / 800       | Landing headlines, page titles, big numbers |
| Body / UI | **Archivo**                                 | 400 / 500 / 600 | Everything a human wrote                    |
| Data      | **Geist Mono**                              | 400 / 500       | Everything the machine produced             |

One superfamily for display and body gives cohesion; the width axis gives the
landing page a poster voice the console doesn't need. Self-hosted `woff2`, subset,
`font-display: swap`, preloaded — no external font CDN (the CSP forbids it anyway).

**Scale** (1.25 ratio, clamped for fluid display sizes):

```
display-xl  clamp(3rem, 7vw, 5.5rem)   Archivo Expanded 800, -0.03em, 0.95 lh
display-l   clamp(2.25rem, 4vw, 3.5rem) Archivo Expanded 700, -0.02em
title       1.75rem / 600
heading     1.25rem / 600
body        0.9375rem / 400, 1.55 lh
small       0.8125rem / 400
mono-data   0.875rem / 450, tabular-nums, 0.01em
mono-micro  0.75rem / 500, uppercase, 0.06em   ← labels, eyebrows
```

`font-variant-numeric: tabular-nums` on every number in a table or a delta. Columns
of prices that don't align are the fastest way to look unfinished.

## 4. The signature: the Pulse Strip

One device, three scales — this is what the product is remembered by.

```
  ▁▁▁▂▁▁█▁▁▁▁▃▁▁▁▁▁▁×▁▁▁▁▂▁▁▁▁▁█▁▁▁
  └ run ticks, oldest → newest. height = change magnitude,
    color = positive/negative/neutral, × = failed run, gap = paused
```

| Scale      | Where                  | Behavior                                                                                         |
| ---------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| **Hero**   | Landing page           | Live-animating, ticks arriving left→right, one large change event resolving into a rendered diff |
| **Row**    | Monitor list, 120×20px | Last 60 runs; hover scrubs a tooltip with value + timestamp                                      |
| **Header** | Monitor detail         | Last 200 runs, click a tick to load that run's diff                                              |

It is not decoration: it's the fastest possible answer to "is this monitor healthy,
and when did things change?" — the two questions every user opens the app with.

## 5. Layout & shape

- 8px spacing base; section rhythm 96/64/48 on the landing page, 24/16/8 in the console.
- Radius: `--r-sm 6px`, `--r-md 10px`, `--r-lg 14px`, `--r-full`. Consistent, mild —
  neither pill-shaped nor brutalist-square.
- Elevation is a border plus a tint, not a heavy shadow. One `--shadow-pop` exists
  for popovers and dialogs only.
- Console grid: fixed 248px sidebar (collapsible to 64px), fluid content, max 1440px.
- Density: comfortable by default, with a **compact toggle** that tightens table row
  height. People running 200 monitors will want it, people running 5 won't.

## 6. Motion

Restrained and purposeful. Everything respects `prefers-reduced-motion`.

| Motion                          | Duration / easing                                         |
| ------------------------------- | --------------------------------------------------------- |
| Hover, focus, color             | 120ms `ease-out`                                          |
| Popover, dropdown, sheet        | 180ms `cubic-bezier(.2,.8,.2,1)`                          |
| Route transition                | 220ms, View Transitions API where supported               |
| New pulse tick arriving         | 400ms scale-in, once                                      |
| Diff reveal on the landing hero | Orchestrated 2.4s sequence, plays once, pauses off-screen |

No parallax, no scroll-jacking, no ambient floating shapes. The landing page gets
**one** orchestrated moment — the hero diff — and nothing else animates on load.

## 7. Landing page

Job: convince a technical person in fifteen seconds that this watches pages properly
and tells them what changed. Copy is plain and active; no "revolutionize", no
"unleash".

```
┌──────────────────────────────────────────────────────────┐
│ [logo] Product  Docs  Pricing  GitHub      [Log in] [Start]│
├──────────────────────────────────────────────────────────┤
│                                                          │
│   KNOW WHAT                    ┌────────────────────┐    │
│   CHANGED                      │ ▁▁▂▁▁█▁▁▃▁▁×▁▁▁▂▁ │    │ ← live pulse
│   ────────────                 ├────────────────────┤    │
│   Watch any page. Get told     │ price              │    │
│   the moment it moves —        │ - $129.00          │    │ ← real diff,
│   with the diff, not a guess.  │ + $99.00  ↓ 23.3%  │    │   animating
│                                │ availability       │    │
│   [Start watching] [See a demo]│ - Out of stock     │    │
│                                │ + In stock         │    │
│                                └────────────────────┘    │
├──────────────────────────────────────────────────────────┤
│  HOW IT WORKS — 01 Point  02 Extract  03 Decide  04 Tell │ ← numbered because
├──────────────────────────────────────────────────────────┤   it IS a sequence
│  WHAT PEOPLE WATCH  — colored cards, one per Signal hue  │
│  prices · restocks · pricing pages · changelogs · jobs   │
├──────────────────────────────────────────────────────────┤
│  NOT EVERY CHANGE IS NEWS  — thresholds, digests,        │
│  quiet hours, ignore rules. Shown as suppressed alerts.  │
├──────────────────────────────────────────────────────────┤
│  CHANNELS — logo grid, "and yours" → webhook + registry  │
├──────────────────────────────────────────────────────────┤
│  SELF-HOST — one compose file, env-configured, your data │
├──────────────────────────────────────────────────────────┤
│  FOOTER · docs · API · GitHub · v1.4.2                   │
└──────────────────────────────────────────────────────────┘
```

The "not every change is news" section is the differentiator and gets real estate:
every competitor promises alerts; the honest pitch is that this one knows when
_not_ to send one.

Landing page constraints: static-renderable, ≤ 120 kB JS, LCP < 1.5s, fully
translated (`landing` namespace), no console code imported.

## 8. Console specifics

- **Sidebar**: nav, then a persistent footer block with **version + connection
  status** (see [04-FRONTEND §8](./04-FRONTEND.md)).
- **Monitor list**: name, pulse strip, current value (mono), delta, status pill,
  next run, tags. The strip is the widest column — it carries the most information.
- **Diff viewer**: word-level, `--positive`/`--negative` tints, inline/split toggle,
  changed-only collapse, keyboard `j`/`k` between hunks.
- **Empty states** are illustrated with the pulse strip in an idle state and a
  single primary action. Never a shrug emoji, never "No data".
- **Status pills**: `ok` neutral-green, `degraded` amber, `failing` red, `paused`
  slate — always dot + word.

## 9. Accessibility floor

Non-negotiable, checked in CI: contrast ≥ 4.5:1 for text and ≥ 3:1 for UI and chart
marks; visible focus ring (`--brand`, 2px, 2px offset) on every interactive element;
full keyboard operation including the diff viewer; `aria-live="polite"` for run
status changes; reduced-motion honored; text scales to 200% without loss; targets
≥ 24×24px. Labels must survive 40% text expansion — no fixed-width buttons.
