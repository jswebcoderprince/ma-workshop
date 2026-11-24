# Design

**Source of truth: the Google Stitch design in [`design/stitch/`](../design/stitch/)** (picked by the owner on 2026-11-23).

| File | What it is |
|---|---|
| `design/stitch/engine_precision_planner/DESIGN.md` | Tokens, type scale, shapes, components (Engine Precision Planner) |
| `design/stitch/overview_workshop_operations_dashboard/` | Desktop overview (`code.html` + `screen.png`) |
| `design/stitch/overview_workshop_operations_mobile/` | Phone overview |
| `design/stitch/schedule_desktop_precision_planner_pro/` | Desktop schedule / timeline with the job inspector |

Earlier frames (`design/frame*.html`) are kept only as history.

## What we take from Stitch, and what we do not

The look, layout and components follow Stitch. Some Stitch content contradicts the client's decisions
(docs/SCOPE.md), so it is replaced:

| In Stitch | In this app | Why |
|---|---|---|
| "Cascade engine", jobs pushed automatically | Overlap warnings + "could start earlier" suggestions; the owner moves jobs | Client: nothing moves on its own (2026-11-22) |
| Bays, lifts, dyno cells | Mechanics only | Client dropped lifts and bays |
| Send SMS / "Notify customer" | Call button (`tel:`) + "Mark informed" | SMS is not in v1 |
| Hour columns, shift times, lunch | Quarter-day columns (2.5 h), opening hours from Settings | Scheduling is in quarters |
| Shift notes, walk-in triage, live bench status | Not shown | Not in scope |
| "Workshop manager" role | "Owner" | One user |

## Tokens (`resources/css/app.css`)

| Token | Value | Use |
|---|---|---|
| canvas / panel / subtle | `#F8FAFC` / `#FFFFFF` / `#F1F5F9` | page / cards / tracks |
| tint | `#EFF4FF` | mechanic day cards on the overview |
| line / line-strong | `#E2E8F0` / `#CBD5E1` | borders, grid lines |
| fg / fg-2 / muted | `#0F172A` / `#334155` / `#64748B` | text |
| p (primary cobalt) | `#1E40AF`, hover `#1D4ED8` | primary buttons, active nav, scheduled / in-progress strip |
| ok (completed) | `#16A34A` · `#DCFCE7` · `#166534` | done, on schedule, "moved earlier" |
| parts (delayed / attention) | `#D97706` · `#FEF3C7` · `#92400E` | overlaps, waiting for parts dot, warnings |
| over / call (urgent) | `#DC2626` · `#FEE2E2` · `#991B1B` | customer to call, errors, fully booked |
| open (opening) | `#6366F1` · `#EEF2FF` · `#3730A3` | free slots, could start earlier |
| hold (leave / closed) | `#64748B` · `#F1F5F9` · `#475569` + 45° hatch | holiday, day off, closed, on hold |
| side / side-2 / side-3 | `#141618` / `#1C1F22` / `#262A2E` | graphite brand half of the login page (the black of maenginelab.lt) |
| brand | `#1FA5A8` | MA Engine Lab teal: logo "A", active nav icon, booked quarters in the sidebar |
| neutrals | canvas `#F3F5F8`, line `#E2E5E9`, fg `#15181C`, muted `#69707A` | neutral grey instead of Tailwind's blue slate |

Teal (`#0B7D7F`) replaces cobalt when Settings → General → Accent is "Brand teal". Dark mode has matching tokens.

Fonts: **IBM Plex Sans** for everything, with tabular figures so times, durations and job numbers line up.
**IBM Plex Mono** only on number plates. (Changed 2026-11-23: the owner said Inter + JetBrains Mono, uppercase
letter-spaced labels and the slate/cobalt sidebar looked AI-made. Labels are now sentence case.) Radius: 8px cards, 6px buttons and inputs, 4px chips. Buttons and inputs are 38px high (44px touch on phones).

## Frame (`resources/js/layouts/app-layout.tsx`)

- Sidebar (`components/app-sidebar.tsx`, 2026-11-24, after the owner's reference picture of a modern admin
  dashboard): white panel, 248px, collapsible to 70px with the round "‹" button on its edge. Every row is icon + name +
  "›"; the open page is a filled primary pill. Open jobs count as a small pill, red dot on Calendar when there are
  overlaps. Hovering a row slides out a small menu to its right (keyboard focus opens it too, Esc closes):
  Calendar → Day / Week / Month (keeps the shown date and mechanic); Jobs → the six status tabs + Customers to call +
  Overlaps with counts; Mechanics → each mechanic with today's four quarters (or why they are off), opens the calendar
  for that mechanic; Invoices → All / Valid / Voided; Settings → its five pages. Collapsed, every row opens its menu
  with the row's own name on top. Bottom: three round buttons (dark/light, account, log out).
  The graphite sidebar with the "Today" list (2026-11-23) is replaced; that list now lives in the Mechanics menu.
  Above the round buttons: an "Install the app" card (tinted primary, icon square, one line, full-width primary button,
  × to hide) until the app is installed; collapsed, a round primary download button. Phones get the same as a slim bar
  above the page.
- Header: breadcrumb (house icon, "›" between parts), "Open today · 08:00 – 18:00" pill, filled search (Ctrl K),
  bell with customers-to-call count, user menu.
- Page heading: 30px bold title, optional pills, subtitle "Today · date · Week N", actions on the right.
- Phones: compact header, 2×2 KPI cards, bottom tab bar (Overview, Calendar, Jobs, Customers, Mechanics), sheets slide up.

## Components (`resources/js/components/ui-kit.tsx`)

KPI `StatCard` (uppercase label, 30px number, tinted icon square, detail area), `Tag` (fill + border + dark label),
`DurationChip` (`0.5d` in mono), `StatusDot`, square `MechanicAvatar`, round `CustomerAvatar`, LT `Plate`,
`Segmented` (slate track, white active pill), `SideSheet` (380–500px right drawer, bottom sheet on phones).

Job card pattern: white card, 4px left strip by state (primary scheduled/in progress, green completed,
slate waiting for parts, amber overlap), `#number · vehicle` in semibold with the number in mono, duration chip,
time range in mono, status text. Free time: dashed indigo card with "+ Book".

## Login, print pages, app icon (2026-11-24)

- Login: graphite brand half (MA mark, name, a week of quarter cells as the picture) next to the form; phones show only the form.
- Print pages (`components/print-sheet.tsx`): A4 sheet, black on white in both themes, toolbar hidden on paper.
  Job card has no prices; the invoice follows the usual Lithuanian layout (seller and buyer side by side, `Serija MAE Nr. 0001`).
- App icon: MA mark on a graphite square (`public/icon-*.png`, maskable variant with a wider margin, `favicon.svg`).

## Calendar (redesigned 2026-11-24)

The owner found the board cluttered. Rules now (`components/calendar/board.tsx`, `status-style.ts`):

- **One look per state**, shared by board, phone agenda and legend: scheduled = white bar, in progress = light blue,
  waiting for parts = amber stripes, completed = grey, **overlap / mechanic off = red** (no longer amber, so it does not
  mix with "waiting for parts").
- **Week**: one header row (weekday + date, today in a filled circle). No quarter-time row; an empty quarter shows
  "+ 10:30" on hover and books there. Bars show make + number (+ surname when wide); 1-quarter bars show the number.
- **Month**: no text in bars any more. Each day is one bar of four segments (booked segments coloured). Hovering a
  job's segment dims the others so the whole job stands out.
- **Hover card** for every job (number, status, make, plate, customer, phone, work, dates, length). Clicking opens
  the inspector.
- Mechanic column: avatar, name, one load bar with %. Free time row: one number per day.
- Inspector floats in from the right over the board (board keeps its width); Esc closes. Phones: bottom sheet.
- Toolbar holds view switch, ‹ Today ›, range, "Booked % | Free time", mechanic filter. Legend and hint sit under the board.
- **Drag and drop** (desktop board, all three views; added 2026-11-24). Pointer events, not HTML5 drag:
  a press becomes a drag after 5 px (mouse) or a 320 ms long press (touch, so a swipe still scrolls).
  The old place stays as a faint bar; a dashed outline glides to where the job would land (red when it would overlap
  or fall on the mechanic's day off); a small card follows the pointer with "→ day · time · mechanic". Esc or letting
  go outside the board cancels. Grabbing a job by its middle keeps that quarter under the pointer (`offset` in
  `jobs.move`). The bar glides to its new place at once (motion `layoutId`), then the server's answer replaces it.
  The toast says "Job moved." with **Undo** (`jobs.undo-move`). Phones keep "Move" in the job sheet.

## Motion

Library: `motion` (Framer Motion). `MotionConfig reducedMotion="user"`, and CSS turns animations off under
`prefers-reduced-motion`.

| What | How |
|---|---|
| Buttons, chips, nav items | press: scale 0.97 in 120–150 ms |
| Clickable cards (KPI cards, today's jobs) | `.lift`: rise 2px + soft shadow on hover (mouse only) |
| Segmented controls, Jobs tabs, sidebar, phone tab bar | active pill / underline slides with a spring (`layoutId`) |
| Page content | `.page-enter`: blocks rise in one after another (40 ms apart) |
| Calendar bars and month cells | fade / rise in when a new range is shown |
| Inspector, sheets, toasts | spring in from the side or bottom, quicker ease out |
| KPI numbers | count up from 0 (`CountUp`) |
| Sidebar | rows slide in once when the app opens (`.nav-in`); the active pill glides between rows; side menus spring out with their rows one after another; the dark/light icon turns |
| Primary buttons | rise 1px with a soft shadow in the accent colour on hover |
| Card grids, table rows | come in one after another (`.stagger`, `.rows-in`; only the first eight wait) |
| Load and progress bars | fill from the left (`.grow-x`) |
| Counters, bell | counters pop in (`.pop-in`); the bell rings once when customers are waiting for a call |

Only transform and opacity animate. Entrance animations use `animation-fill-mode: backwards`: a transform left on a
block would become the frame for fixed popups (the hover card was misplaced because of that).
