# Design

Reference: [`design/frame.html`](../design/frame.html) (v3, approved direction 2026-11-23). Open it in a browser; it runs on sample data.

History, kept only for comparison:
- `design/frame-v1-dark.html`: copied the marketing site (dark, condensed caps). Rejected as looking generic.
- `design/frame-v2-neutral.html`: neutral product UI (Resource Guru / Float style). Superseded by v3.

## Direction

The owner picked an admin-dashboard reference (Dribbble-style "Dashboard" shot, 2026-11-23). v3 follows it:

- Lavender-tinted canvas with white cards, 14 px radius, hairline borders, almost no shadow.
- Violet primary. Active sidebar item is a filled violet pill with white text.
- Top bar: logo block with collapse chevron, pill search (Ctrl K), a select (mechanic filter), dark-mode switch,
  inbox icon with a red count, find-a-slot icon, avatar.
- A breadcrumb card at the top of every page, with the page's main buttons on the right ("Find a slot", "New job").
- KPI cards: label + kebab, coloured square icon, big number, small trend or note, grey footnote.
- Area chart with soft gradient fills and an underline tab switch (8 weeks / 4 weeks).
- Lists with avatars and right-aligned numbers ("Mechanics" card, like the reference's "Sales performance").
- Tables: checkbox column, grey header band, coloured dot + text for status, "…" actions.

Brand link: the **accent can be switched** to MA Engine Lab teal in Settings → General → Accent colour.
Violet is the default because it is what the owner chose; the client can pick teal at handover.

## Tokens

| Token | Light | Use |
|---|---|---|
| `--canvas` | `#f3f2fa` | page behind cards |
| `--panel` | `#ffffff` | cards, sidebar, top bar, sheets |
| `--subtle` | `#f7f6fc` | table header band, search field |
| `--line` / `--line-strong` | `#ebeaf3` / `#dddbea` | borders |
| `--fg` / `--fg-2` / `--muted` | `#1d1b38` / `#46445f` / `#8b8aa3` | text |
| `--p` | `#6c5dd3` (teal option `#0b8a8c`) | primary, active nav, today, scheduled/in progress |
| `--ok` | `#22b07d` | in progress dot, "free" hints, good trend |
| `--parts` | `#e59a1a` | waiting for parts |
| `--over` | `#e5484d` | overlap, mechanic off, inbox count |
| `--call` | `#1d9bf0` | customer to call (ring + phone icon) |
| KPI icons | `#22b07d` `#3b82f6` `#8b5cf6` `#ec4899` | the four stat cards |

Dark theme has matching tokens (switch in the top bar). Mechanic avatar colours: violet, blue, green, pink.

Font: **Jost** 400/500/600 (covers Lithuanian letters). Icons: **Lucide** (`lucide-react` in the app).
Numbers use tabular figures.

## Pages

| Page | Layout |
|---|---|
| Overview | 4 KPI cards (booked this week + next week, next free day, waiting for parts, customers to call) · workload chart (booked vs available days per week) · mechanics list (load %, next free day) · upcoming jobs table |
| Calendar | one card: title + Month/Week/Day underline tabs + Today/arrows/range; note chips (to call, could start earlier, overlaps → Review); resource grid; legend |
| Jobs | card with status filter chips and the jobs table |
| Customers | card with search and table; customer sheet |
| Mechanics | cards per mechanic (working days, 4-week load bar, time off) · add time off · workshop closed days |
| Invoices | 3 KPI cards · invoices table · A4 preview |
| Settings | card with left tab list: General (language, theme, accent), Company, Invoices, Working hours |

## Calendar rules (unchanged from v2)

- Columns are quarters: weekday 4, Saturday 2, Sunday 1 narrow column. Week row (`W 48 · 23 Nov – 29 Nov`) above the day row.
- Rows: avatar, name, vehicle types, load chip for the visible range (green < 70 %, amber 70–89 %, red ≥ 90 %).
- Blocks: month view = surname only; week view = name, vehicle, work, duration. Soft violet = scheduled,
  solid = in progress, dashed amber stripes = waiting for parts, struck grey = completed, blue ring = to call, red = overlap.
- Time off / closed days: grey hatching with an icon (label in week view, tooltip in month view).
- "Free time" row at the bottom: bar + number of free mechanic days per day.

## Phones (under 900 px)

Bottom tab bar (Overview, Calendar, Jobs, Customers, Settings), logo + name in the top bar, breadcrumb card shows the
page title with icon-only buttons, KPI cards two per row, calendar opens in Day view, sheets slide up from the bottom.

## Print

Job card and invoice: A4, Jost, black on white, thin grey boxes, no app chrome. Printed with the browser.
