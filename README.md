# MA Workshop

Workshop planner for **MA Engine Lab** (Prienai, Lithuania), a garage for cars, motorcycles and watercraft with a
waiting list of about three weeks. The owner books jobs for each mechanic in quarter-day steps, sees overlaps and
days off at a glance, knows which customers to call after a change, and prints job cards and VAT invoices.

Built with Laravel 12, Inertia and React 19. Delivered in Lithuanian (English in Settings). Installable on phones.

Live (planned): `https://workshop.maenginelab.lt`

![Overview](docs/screenshots/01-overview.png)

## Status (2026-11-24)

| | |
|---|---|
| Phases 1–8 | Done: scheduling engine, calendar (day, week, month, drag and drop with Undo), jobs, customers, mechanics, job cards, invoices, PWA, redesign |
| Phase 9 | Waiting: deploy to the client's Hostinger plan, real company details and mechanics, switch to Lithuanian ([docs/DEPLOY.md](docs/DEPLOY.md)) |
| Tests | 118 passing (`php artisan test`) |
| Guide for the owner | [Lithuanian](docs/OWNER_GUIDE.lt.md) · [English](docs/OWNER_GUIDE.md) |

The data in the screenshots is fictional sample data.

## What it does

- **Calendar** per mechanic in quarters of 2.5 hours (Mon–Fri 4, Saturday 2). Day, week and month views.
- **Book** by clicking an empty spot, with **New job**, or with **Find a slot** (earliest free time per mechanic
  for a vehicle type and length).
- **Move** by dragging a job (with Undo) or from the job panel; longer or shorter in quarter steps.
- **Nothing moves by itself.** Overlaps and jobs during a mechanic's time off turn red; the owner decides.
- **Could start earlier:** when time frees up, the app suggests jobs to pull forward.
- **Customers to call:** a job moved to another date flags the customer (earlier / later) until marked informed.
- **Mechanics:** working days, vehicle types, holidays, days off, sick leave; workshop closed days.
- **Customers and vehicles** stored for reuse; search by name, phone or plate.
- **Job card** (A4, for the mechanic) and **VAT invoice** (series MAE, numbers never reused; void and re-issue).
- **Install as an app** on a computer (Chrome, Edge), Android, iPhone/iPad and Mac from the app's own Install button:
  own window, MA icon, shortcuts (New job, Calendar, Jobs, Customers to call), updates by itself.
- **Activity history** on every job. Light and dark mode. Lithuanian and English.

## Screenshots

### Calendar

| Week view | Job panel |
|---|---|
| ![Week](docs/screenshots/02-calendar-week.png) | ![Job panel](docs/screenshots/03-calendar-inspector.png) |
| **Drag and drop** (the outline turns red on overlap) | **Month view** |
| ![Drag](docs/screenshots/04-calendar-drag.png) | ![Month](docs/screenshots/05-calendar-month.png) |
| **New job** | **Side menu** (hover a menu item) |
| ![New job](docs/screenshots/06-new-job.png) | ![Side menu](docs/screenshots/14-sidebar-menu.png) |

### Jobs, invoices, customers, mechanics

| Jobs | Job page with work, parts and invoice |
|---|---|
| ![Jobs](docs/screenshots/07-jobs.png) | ![Job page](docs/screenshots/08-job-page.png) |
| **VAT invoice** (print or PDF) | **Job card** (print) |
| ![Invoice](docs/screenshots/09-invoice-print.png) | ![Job card](docs/screenshots/10-job-card-print.png) |
| **Customers** | **Mechanics and time off** |
| ![Customers](docs/screenshots/11-customers.png) | ![Mechanics](docs/screenshots/12-mechanics.png) |
| **Settings** | **Sign in** |
| ![Settings](docs/screenshots/13-settings.png) | ![Login](docs/screenshots/00-login.png) |

### Dark mode and Lithuanian

| Dark mode | Lithuanian (the delivered language) |
|---|---|
| ![Dark](docs/screenshots/15-dark.png) | ![Lithuanian](docs/screenshots/19-lithuanian.png) |

### Phone

| Overview | Calendar | Jobs |
|---|---|---|
| ![Phone overview](docs/screenshots/16-mobile-overview.png) | ![Phone calendar](docs/screenshots/17-mobile-calendar.png) | ![Phone jobs](docs/screenshots/18-mobile-jobs.png) |

### Install as an app

| Computer: Install card in the menu | iPhone: the steps (Safari has no install button) |
|---|---|
| ![Install on a computer](docs/screenshots/22-install-desktop.png) | ![Install on iPhone](docs/screenshots/21-mobile-install-iphone.png) |

## Design

![Design sheet](docs/screenshots/design-sheet.png)

The design sheet above is [design/design-sheet.html](design/design-sheet.html) (open it in a browser).

- **Look:** light grey canvas, white cards with 12 px corners, one accent colour (cobalt `#1E40AF`, or MA Engine Lab
  teal from Settings), one colour per job state (red = overlap / to call, amber = waiting for parts, green = done,
  indigo = free time). Dark mode has matching colours.
- **Type:** IBM Plex Sans with tabular figures; IBM Plex Mono only on number plates. Sentence case.
- **Sidebar:** white panel after the owner's reference picture: icon + name + "›" rows, the open page as a filled
  pill, side menus on hover, collapsible to icons.
- **Motion:** short springs and fades (sidebar, side menus, toasts, drag and drop), staggered cards and rows, bars
  that fill, the bell rings once when customers wait for a call. Off when the system asks for less motion.
- **History:** first frames (`design/frame*.html`) → Google Stitch "Engine Precision Planner" (`design/stitch/`)
  → graphite sidebar → the current white sidebar. Full rules in [docs/DESIGN.md](docs/DESIGN.md).

## Documents

| File | What is in it |
|---|---|
| [docs/OWNER_GUIDE.lt.md](docs/OWNER_GUIDE.lt.md) · [EN](docs/OWNER_GUIDE.md) | How the owner uses the app day to day (Lithuanian, English) |
| [docs/SCOPE.md](docs/SCOPE.md) | What v1 does and does not do, client decisions with dates |
| [docs/SCHEDULING_RULES.md](docs/SCHEDULING_RULES.md) | Quarters, positions, warnings, free slot search, "could move earlier" |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Tables and relations |
| [docs/SITEMAP.md](docs/SITEMAP.md) | Pages, URLs, drawers, endpoints |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, code layout, language switch, PWA, Hostinger deploy |
| [docs/DESIGN.md](docs/DESIGN.md) | Colours, fonts, status styles, layout rules, motion |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Step by step deploy to Hostinger |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phases and status |

## Tech

Laravel 12 (PHP 8.3), MySQL, Inertia 2, React 19, TypeScript, Tailwind CSS 4, motion (Framer Motion), lucide icons.
Scheduling maths is plain PHP in `app/Scheduling` with unit tests. In code a "job" is `WorkOrder` (`work_orders`),
because Laravel's queue owns the `jobs` table.

## Run locally (Windows)

Needs XAMPP MySQL running, PHP 8.3 at `C:\php83`, Node 20+.

```bash
composer install
npm install
cp .env.example .env && C:/php83/php.exe artisan key:generate
C:/php83/php.exe artisan migrate --seed       # SEED_DEMO=true in .env adds the sample data
C:/php83/php.exe artisan serve --port=8010    # http://127.0.0.1:8010
npm run dev
```

Tests use the `ma_workshop_test` database:

```bash
C:/php83/php.exe artisan test
```
