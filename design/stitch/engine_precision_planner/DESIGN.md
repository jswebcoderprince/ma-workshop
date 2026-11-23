---
name: Engine Precision Planner
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#444653'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#757684'
  outline-variant: '#c4c5d5'
  surface-tint: '#3755c3'
  primary: '#00288e'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#273548'
  on-tertiary: '#ffffff'
  tertiary-container: '#3e4c60'
  on-tertiary-container: '#aebcd4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#d5e3fc'
  tertiary-fixed-dim: '#b9c7df'
  on-tertiary-fixed: '#0d1c2e'
  on-tertiary-fixed-variant: '#3a485b'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  canvas-bg: '#F8FAFC'
  surface-bg: '#FFFFFF'
  surface-subtle: '#F1F5F9'
  border-subtle: '#E2E8F0'
  border-strong: '#CBD5E1'
  text-primary: '#0F172A'
  text-secondary: '#334155'
  text-muted: '#64748B'
  status-completed-bg: '#DCFCE7'
  status-completed-border: '#86EFAC'
  status-completed-text: '#166534'
  status-completed-dot: '#16A34A'
  status-delayed-bg: '#FEF3C7'
  status-delayed-border: '#FCD34D'
  status-delayed-text: '#92400E'
  status-delayed-dot: '#D97706'
  status-opening-bg: '#EEF2FF'
  status-opening-border: '#C7D2FE'
  status-opening-text: '#3730A3'
  status-opening-dot: '#6366F1'
  status-urgent-bg: '#FEE2E2'
  status-urgent-border: '#FCA5A5'
  status-urgent-text: '#991B1B'
  status-urgent-dot: '#DC2626'
  status-leave-bg: '#F1F5F9'
  status-leave-border: '#CBD5E1'
  status-leave-text: '#475569'
  status-leave-dot: '#64748B'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system is engineered specifically for fast-paced, high-focus workshop operations. Designed for automotive shop managers, head technicians, and service coordinators, the interface prioritizes spatial clarity, instant state recognition, and mechanical dependability over decorative flair. 

The aesthetic marries **Corporate / Modern utilitarianism** with **industrial precision**:
- **Utilitarian & Grounded:** Clean structural borders, crisp information density, and instant hierarchy.
- **Calm Operational Cockpit:** Avoids alarm fatigue through deliberate color containment—status tones (delays, early finishes, leaves) exist solely within semantic indicators, leaving the structural environment neutral and quiet.
- **Instrument-Grade Typography & Metrics:** Tabular figures, strict quarter-day tags (`0.25d`, `0.5d`, `0.75d`, `1.0d`), and unambiguous mechanic timeline lanes keep cognitive friction at near zero during complex job reallocations.

## Colors

The palette is engineered for high data density and ambient comfort during full-shift usage.

### Foundation & Surfaces
- **Canvas (`#F8FAFC`)**: Soft slate base that reduces monitor glare in repair shop environments.
- **Surface (`#FFFFFF`)**: Pure white containers and timeline blocks that pop crisply from the canvas.
- **Dividers & Grids (`#E2E8F0` / `#CBD5E1`)**: Subtle lines delineating hour blocks, mechanic lanes, and card borders without visual noise.

### Primary Accents & Hierarchy
- **Primary Cobalt (`#1E40AF`)**: Authoritative, stable, and distinct. Used for primary interactions ("Add job", "Confirm timeline cascade", primary view toggles).
- **Secondary Slate (`#0F172A`)**: High-contrast text and anchor chrome elements.

### Operational Semantic Tones
All semantic tokens are paired into a tri-layer system (light surface fill, crisp stroke border, dark high-contrast label) with a saturated core pip:
- **Completed / On-Schedule (`#16A34A`)**: Calm emerald signaling balanced execution.
- **Delayed / Attention Required (`#D97706`)**: Warm amber warning indicating cascade impacts and customer contact requirements.
- **Early Finish / Available Opening (`#6366F1`)**: Distinct indigo-purple highlighting newly freed repair time without clashing with standard blue UI controls.
- **Urgent / Unscheduled (`#DC2626`)**: Direct crimson for missed deadlines, unassigned tickets, or un-notified customers.
- **Leave / Workshop Closed (`#64748B`)**: Hatching and neutral muted slate representing non-operational mechanic blocks.

## Typography

The type system is powered by **Inter**, chosen for its tall x-height, robust legibility at small sizes, and built-in OpenType tabular number support (`font-feature-settings: "tnum" 1, "cv05" 1`).

### Guidelines & Rules
- **Tabular Numerals Everywhere in Schedules:** All timestamps (`08:30`, `14:15`), registration numbers (`WP21 XLO`), and duration tokens (`0.25d`, `0.75d`) must use tabular figures to ensure timeline alignment across mechanic blocks.
- **Labels & Status Badges:** Use `label-sm` with a modest tracking bump (`+0.02em`) for mechanic tags, customer notification flags, and quarter-day pills.
- **Density Control:** Never use body copy smaller than `13px` inside interactive schedule blocks. Critical metadata (e.g., job title + vehicle) relies on high-contrast weights (`body-sm` bold / medium) to remain readable on tablet viewports in shop bays.

## Layout & Spacing

The layout is built around a practical multi-panel fluid grid that adapts strictly according to the manager's task.

### Grid & Breakpoints
- **Desktop (≥ 1280px):** Fixed compact left navigation bar (64px collapsed icon or 200px labeled), full-width responsive calendar grid with persistent sticky mechanic headers, and a conditional slide-over side drawer (380px) for job details.
- **Tablet (768px – 1279px):** Slim navigation rail (64px), horizontal scroll timeline canvas with locked mechanic column on the left, modal or sheet overlays for job inspector.
- **Mobile (< 768px):** Reflows the 2D grid into an agenda-based stack: Date selector bar → Mechanic chip filter → Chronological card deck.

### Timeline Geometry
- **Hour / Time Slots:** In desktop day/week views, timeline lanes are subdivided into 15-minute quantum increments (aligned with 0.25d increments).
- **Rhythm:** Uniform 8px base rhythm (`space-sm` = 8px, `space-md` = 16px, `space-lg` = 24px).

## Elevation & Depth

This system avoids floating cloud shadows, neon glows, or heavy blurs. Depth is conveyed strictly through **tonal layering and low-contrast perimeter definition**.

- **Canvas & Level 0:** The app foundation sits at `#F8FAFC`.
- **Level 1 (Panels & Cards):** Schedule blocks, summary cards, and timeline lanes use pure white (`#FFFFFF`) with a 1px border (`#E2E8F0`). A light ambient shadow (`0 1px 2px 0 rgba(15, 23, 42, 0.05)`) gives separation without visual clutter.
- **Level 2 (Timeline Blocks & Popovers):** Active draggable timeline items and quick popovers use `0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.05)` and a strengthened border (`#CBD5E1`).
- **Level 3 (Inspection Drawer & Modals):** Job editing sheets and cascade confirmation modals use `0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -4px rgba(15, 23, 42, 0.05)` paired with a soft slate backdrop overlay (`rgba(15, 23, 42, 0.4)`).
- **Unavailable / Non-Working Areas:** Non-elevated, styled with `#F1F5F9` and 45-degree micro-diagonal hatching to instantly denote off-duty mechanic hours.

## Shapes

The design uses **Level 1 (Soft)** shape geometry:
- Default elements (buttons, inputs, timeline blocks, list items) use **4px (`0.25rem`)** to **6px** radius.
- Cards, containers, modals, and panel drawers use **8px (`0.5rem`)**.
- Status indicators and quarter-day tags use **4px** or full pill forms strictly where compactness requires pill distinction.

This restrained geometry preserves maximum screen real estate within tight timeline lanes and maintains the industrial, no-nonsense character of a professional workshop tool.

## Components

### 1. Timeline Job Blocks
- **Container:** Minimum height 48px, 6px border radius, 1px border stroke.
- **Structure:** Left edge features a 4px solid status color strip. Content includes vehicle badge (`Ford Transit • AB21 CDE`), job title (`Clutch Replacement`), duration chip (`0.5d`), and customer notification status icon.
- **Cascade Movement State:** When downstream jobs shift due to a delay, the shifted block exhibits a dashed amber border, a ghost silhouette of the original slot, and a clear "+1.5h shift" delta badge.
- **Early Finish Opening:** Outlined dashed block with `#EEF2FF` fill and label: `Available Slot (0.25d)`.

### 2. Buttons
- **Primary:** `#1E40AF` background, white label, 6px radius, height 38px (desktop) / 44px (mobile), hover `#1D4ED8`.
- **Secondary / Outline:** `#FFFFFF` background, `#E2E8F0` border, `#0F172A` text, hover `#F8FAFC`.
- **Destructive:** `#DC2626` background or soft red ghost button for discarding changes.

### 3. Quarter-Day Duration Selector
- A specialized segmented control displaying 4 distinct buttons: `0.25d (2h)`, `0.5d (4h)`, `0.75d (6h)`, `1.0d (8h)`.
- Active segment: `#1E40AF` background with pure white text and tabular numerals. Inactive segments: `#FFFFFF` with `#E2E8F0` borders.

### 4. Status Chips & Badges
- **Customer Informed:** Emerald pill (`#DCFCE7` / `#166534`) with check icon.
- **Inform Customer Required:** High-contrast amber badge (`#FEF3C7` / `#92400E`) with prompt icon. Clicking opens quick SMS/call confirmation.
- **On Leave / Workshop Closed:** Neutral gray badge (`#F1F5F9` / `#475569`).

### 5. Input Fields & Forms
- Standard height 38px, 6px border radius, `#FFFFFF` background, `#CBD5E1` border. Active focus ring: 2px `#1E40AF` with a 2px offset.
- Form inputs group logically: Customer Details → Vehicle Particulars → Scheduling & Duration → Internal Workshop Notes.

### 6. Mechanic Lanes (Schedule Row)
- Sticky left column (200px width on desktop) containing mechanic avatar, name, and active utilization badge (e.g. `6.5 / 8.0h assigned`).
- Continuous horizontal grid with vertical 1-hour marker borders and soft half-hour dotted guidelines.