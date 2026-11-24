# Architecture

## Stack

| Part | Choice | Why |
|---|---|---|
| Backend | Laravel 12, PHP 8.3 | Runs on the client's Hostinger plan as is (their site already uses PHP 8.3) |
| Frontend | Inertia 2 + React 19 + TypeScript + Tailwind 4 | Laravel React starter kit; no separate API to maintain |
| UI kit | shadcn/ui components from the starter kit, restyled with our tokens | Accessible dialogs, selects, popovers |
| Database | MySQL / MariaDB | Hostinger shared hosting |
| Calendar | Our own CSS-grid component | Off-the-shelf resource timelines (FullCalendar) are paid; our grid is simple (days × quarters) |
| PDF | Browser print with A4 CSS | "Save as PDF" is built into every browser; no server PDF library |
| Install | PWA: web manifest + small service worker + an "Install" button in the app | Computer (Chrome/Edge) and Android: the app's own button opens the browser's install dialog; iPhone/iPad and Mac Safari: the app shows the steps |

## Code layout

```
app/
  Scheduling/          pure PHP, no Laravel: the rules in SCHEDULING_RULES.md
    WorkCalendar.php     working quarters, positions, closures
    Availability.php     mechanic days, time off
    Occupancy.php        which positions a mechanic's jobs use, warnings
    SlotFinder.php       find a free slot, could-move-earlier
  Models/              Eloquent models
  Http/Controllers/    thin controllers, one per page
  Actions/             MoveJob, ChangeDuration, IssueInvoice … (each writes activity_log)
  Support/Settings.php cached key-value settings
resources/js/
  pages/               one file per URL
  components/calendar/ grid, job bar, drawers
  lib/i18n.ts          t() helper
lang/lt.json, en.json  all UI strings
docs/                  these files
design/frame.html      approved design frame (static, sample data)
```

The scheduling code is pure PHP so it can be unit-tested fast without a database, and the same results are sent
to the frontend. The frontend does not redo the maths; it renders positions the server computed.

## Language

- All UI text goes through `__()` in PHP and `t()` in React. Strings live in `lang/lt.json` and `lang/en.json`.
- The active language is the `locale` setting (one for the whole app, not per user), changed in Settings.
- Default during development: `en`. On delivery we switch it to `lt` in Settings.
- Dates are formatted per language (`lapkričio 23 d.` / `23 Nov`). Money in `lt-LT` format: `1 234,50 €`.
- Customer data (names, job descriptions) is whatever the owner types; it is not translated.

## PWA

- `public/manifest.webmanifest`: name, Lithuanian description, icons (192, 512, maskable), `display: standalone`, theme
  colour, and shortcuts on the installed icon (Naujas darbas → `/calendar?new=1`, Kalendorius, Darbai, Reikia paskambinti).
- In-app install (`lib/install.ts`, `components/install-app.tsx`, 2026-11-24): `beforeinstallprompt` is caught in
  `app.tsx` before React draws and kept for our own button. Shown as a card at the bottom of the sidebar, a slim bar on
  phones, an item in the user menu and a section in Settings → General. Safari has no prompt, so iPhone/iPad get the
  three steps (Share → Add to Home Screen → Add) and Mac Safari gets File → Add to Dock. Hidden once installed
  (`display-mode: standalone`); the card and bar can be closed (remembered in this browser).
- `public/sw.js`: caches the app shell and static assets only. Data is always live; no offline mode in v1.
- iOS needs `apple-touch-icon` and `apple-mobile-web-app-capable` meta tags.

## Hosting (Hostinger)

- Subdomain: `workshop.maenginelab.lt`, on the same Hostinger plan as the website, separate from WordPress.
- Separate MySQL database and user (only this database).
- Code outside the web root: `~/domains/maenginelab.lt/workshop-app/`. The subdomain's document root points to
  its `public/` folder (or a symlink if hPanel does not allow it).
- Deploy over SSH: build assets locally (`npm run build`), upload with rsync/scp, then
  `composer install --no-dev`, `php artisan migrate --force`, `config:cache`, `route:cache`, `view:cache`.
- Cron (hPanel): `php artisan schedule:run` every minute. Used for nightly database backup.
- HTTPS: Hostinger free SSL on the subdomain. `APP_URL` must be the https address (PWA needs HTTPS).
- `noindex`: `X-Robots-Tag: noindex` header and `robots.txt` disallow all. It is a private tool.

## Security

- One user; registration and password reset by email disabled (owner resets via us).
- Login throttling (starter kit), session cookies `secure` + `httponly` + `samesite=lax`.
- Every route behind `auth`. CSRF on all forms (Inertia handles it).
- Daily database dump kept 14 days in a non-public folder.

## Local development

```
C:\php83\php.exe artisan serve        # PHP 8.3; XAMPP's PHP is 8.2
npm run dev                           # Vite
```

MySQL comes from XAMPP. Databases: `ma_workshop` (dev), `ma_workshop_test` (tests).
If XAMPP MySQL is not running, tests hang silently instead of failing.
