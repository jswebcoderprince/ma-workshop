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
| side | `#0F172A` / `#1E293B` | dark sidebar |

Teal (`#0B7D7F`) replaces cobalt when Settings → General → Accent is "Brand teal". Dark mode has matching tokens.

Fonts: **Inter** (UI) and **JetBrains Mono** (job numbers, times, durations, plates). Tabular numerals everywhere
in schedules. Radius: 8px cards, 6px buttons and inputs, 4px chips. Buttons and inputs are 38px high (44px touch on phones).

## Frame (`resources/js/layouts/app-layout.tsx`)

- Dark sidebar (264px, collapsible to 64px): logo square, "Booked today" widget (quarters booked of available + bar),
  navigation (active = filled primary), jobs count, amber dot on Calendar when there are overlaps,
  "Mechanics today" roster with a load / holiday / day off badge per mechanic, dark-mode switch.
- Header: breadcrumb, "Open today · 08:00 – 18:00" pill, search (Ctrl K), bell with customers-to-call count, user menu.
- Page heading: 30px bold title, optional pills, subtitle "Today · date · Week N", actions on the right.
- Phones: compact header, 2×2 KPI cards, bottom tab bar (Overview, Calendar, Jobs, Customers, Mechanics), sheets slide up.

## Components (`resources/js/components/ui-kit.tsx`)

KPI `StatCard` (uppercase label, 30px number, tinted icon square, detail area), `Tag` (fill + border + dark label),
`DurationChip` (`0.5d` in mono), `StatusDot`, square `MechanicAvatar`, round `CustomerAvatar`, LT `Plate`,
`Segmented` (slate track, white active pill), `SideSheet` (380–500px right drawer, bottom sheet on phones).

Job card pattern: white card, 4px left strip by state (primary scheduled/in progress, green completed,
slate waiting for parts, amber overlap), `#number · vehicle` in semibold with the number in mono, duration chip,
time range in mono, status text. Free time: dashed indigo card with "+ Book".
