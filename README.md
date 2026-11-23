# MA Workshop

Workshop scheduling app for MA Engine Lab (Prienai, Lithuania): mechanics' calendar in quarter-day steps,
holidays, "find a free slot", "customer to contact", job cards and simple invoices.
Laravel 12 + Inertia + React 19. Installable on phones as a PWA.

Live (planned): `https://workshop.maenginelab.lt`

## Documents

| File | What is in it |
|---|---|
| [docs/SCOPE.md](docs/SCOPE.md) | What v1 does and does not do, client decisions with dates |
| [docs/SCHEDULING_RULES.md](docs/SCHEDULING_RULES.md) | Quarters, positions, warnings, free slot search, "could move earlier" |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Tables and relations |
| [docs/SITEMAP.md](docs/SITEMAP.md) | Pages, URLs, drawers, endpoints |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, code layout, language switch, PWA, Hostinger deploy |
| [docs/DESIGN.md](docs/DESIGN.md) | Colours, fonts, status styles, layout rules |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phases and status |
| [design/frame.html](design/frame.html) | Clickable design frame with sample data (open in a browser) |

## Run locally (Windows)

Needs XAMPP MySQL running, PHP 8.3 at `C:\php83`, Node 20+.

```bash
C:/php83/php.exe artisan migrate --seed
C:/php83/php.exe artisan serve --port=8010   # http://127.0.0.1:8010 (8000 is often taken by other projects)
npm run dev
```

Tests use the `ma_workshop_test` database:

```bash
C:/php83/php.exe artisan test
```
