# Design

Reference: [`design/frame.html`](../design/frame.html) (v2). Open it in a browser; it runs on sample data.
`design/frame-v1-dark.html` is the first attempt, rejected on 2026-11-23 as looking generic. Kept only for history.

## Direction

The app is a working tool used all day at a desk and on a phone, so it follows the conventions of
established scheduling and garage software rather than the marketing website:

- **Resource Guru / Float** (people × days timeline): avatar + name + load % per row, week numbers in the header,
  today highlighted, weekends tinted, soft filled booking blocks, capacity shown per day.
- **Shopmonkey** (garage software): white canvas, one strong accent, vehicle details with plate chips, status pills.
- **Linear / Cal.com** (modern SaaS): quiet neutral greys, Inter, sentence case, small radius, side sheets, Ctrl K search.

Brand link: MA Engine Lab's teal from maenginelab.lt is the only accent colour, and the logo mark sits in the sidebar.
The website's wide display font and all-caps style are **not** used in the app.

Things to avoid (they made v1 look generated): uppercase letter-spaced labels everywhere, condensed display fonts,
neon accent on near-black, coloured left borders on every card, banner strips.

## Tokens (light is the default; dark is a toggle in Settings)

| Token | Light | Use |
|---|---|---|
| `--bg` | `#f6f7f7` | page |
| `--panel` | `#ffffff` | cards, sidebar, sheets |
| `--subtle` | `#f3f4f5` | table headers, inputs at rest |
| `--line` / `--line-strong` | `#e6e8ea` / `#d3d7da` | borders |
| `--fg` / `--fg-2` / `--muted` | `#101828` / `#344054` / `#667085` | text |
| `--accent` | `#0b7d7f` | brand teal: primary buttons, today, selection |
| `--accent-soft` | `#e7f4f4` | scheduled jobs, selected chips |
| `--prog` | `#0e8f91` | in-progress jobs (solid) |
| `--parts-*` | `#fff6e5` / `#8a5300` | waiting for parts (dashed, striped) |
| `--done-*` | `#f2f4f7` / `#98a2b3` | completed (struck through) |
| `--over-*` | `#fef1f0` / `#b42318` | overlap or mechanic off |
| `--notify` | `#6e56cf` | customer to call (outline ring + phone icon) |

Font: **Inter** 400/500/600, 14 px base, tabular numbers for dates and money. Icons: **Lucide** (already in the
React starter kit as `lucide-react`). Radius 6–12 px. Shadows only on raised surfaces (sheets, popovers).

Mechanic colours (avatars only): teal `#0e8f91`, indigo `#4f62d6`, amber `#c2780c`, rose `#c4416f`.

## Calendar

- Header: week row (`W 48 · 23 Nov – 29 Nov`) above a day row. Today's date is a filled teal pill.
- Columns are quarters: weekday 4, Saturday 2, Sunday 1 narrow tinted column.
- Rows: avatar, name, vehicle types, and a load chip (% of free time already booked in the visible range,
  green < 70 %, amber 70–89 %, red ≥ 90 %). Extra lanes appear when jobs overlap or wait for parts.
- Blocks: month view shows surname only; week view shows name, vehicle, work and duration.
- Time off and closed days: grey hatching with a small icon (label in week view, tooltip in month view).
- Bottom row "Free time": bar per day of free mechanic time, with the number of free days.
- Above the grid, one summary strip: N to call · N could start earlier · N overlaps → Review (opens the inbox sheet).

## Other patterns

- Side sheet from the right (bottom sheet on phones) for job details, new job, find a slot, inbox, customer.
- Lithuanian number plates shown as a small plate chip with the blue EU band.
- Global search in the top bar (Ctrl K): customers by name, phone or plate.
- Tables: sentence-case headers on a grey band, 44 px rows, no wrapping except the work description.
- Under 900 px: bottom tab bar, day view by default, sheets become bottom sheets.

## Print

Job card and invoice: A4, Inter, black on white, thin grey boxes, no app chrome. Printed with the browser.
