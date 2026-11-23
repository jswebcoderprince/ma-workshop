# Design

Reference: [`design/frame.html`](../design/frame.html). Open it in a browser; it runs on sample data.
It continues the look of the first prototype (`design/prototype-v0.html`) that the client liked.

## Tokens

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#0b0e0f` | `#f2f5f5` | page |
| `--surface` | `#141a1c` | `#ffffff` | cards, sidebar |
| `--surface-2` | `#1b2325` | `#e9eff0` | inputs, headers |
| `--line` | `#263033` | `#d2dcdd` | borders |
| `--fg` | `#e8eff0` | `#11181a` | text |
| `--muted` | `#8ca0a3` | `#5c6c6e` | secondary text |
| `--accent` | `#00b3b5` | `#00797b` | primary, scheduled, in progress |
| `--parts` | `#d9a21b` | `#96690a` | waiting for parts |
| `--over` | `#e0623d` | `#b8431f` | overlap, extended, errors |
| `--notify` | `#a78bfa` | `#6d4fd6` | customer to contact |
| `--done` | `#5d6d70` | `#9aa8aa` | completed |

Fonts: **Barlow Condensed** (headings, buttons, numbers in the grid header), **IBM Plex Sans** (text).
Both cover Lithuanian letters (ą č ę ė į š ų ū ž).

Theme: follows the device, with a manual toggle. Dark is the default look.

## Status colours on the calendar

| State | Look |
|---|---|
| Scheduled | surface bar, teal left edge |
| In progress | teal-tinted bar |
| Waiting for parts | amber left edge, striped |
| Completed | faded |
| Customer to contact | violet outline + dot |
| Overlap / mechanic off | orange outline + ⚠ |
| Holiday, day off, closed | diagonal hatching across the cell |

Colour is never the only signal: every state also has a text label (tag, tooltip or ⚠).

## Layout

- Desktop: left sidebar navigation, page title bar with main actions, content.
- Under 900 px: bottom tab bar, the calendar opens in **day** view by default, the month grid scrolls sideways
  with the mechanic names fixed on the left.
- Drawers slide in from the right (full screen on phones) for job details, new job, find a slot, customer.
- Touch targets at least 44 px on phones.

## Calendar grid

- Columns are quarters. A weekday is 4 columns, Saturday 2, Sunday 1 narrow empty column (visual break).
- Rows are mechanics. If jobs of one mechanic overlap (or a job waits for parts), the row grows extra lanes.
- Bottom row "Free, days": free capacity across all mechanics per day, so the owner sees the waiting list at a glance.
- Click an empty spot → new job at that mechanic, day and quarter.

## Print

Job card and invoice are A4, black on white, no app chrome. Printed with the browser (Ctrl+P / Save as PDF).
