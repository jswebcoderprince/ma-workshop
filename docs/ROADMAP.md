# Roadmap

Target: about 10–14 working days for v1. Each phase ends with a deploy to `workshop.maenginelab.lt`
once hosting access is set up, so the client sees real progress.

| # | Phase | Contents | Status |
|---|---|---|---|
| 1 | Foundation | Scope, rules, data model, sitemap, design frame, Laravel + React project | done 2026-11-23 |
| 2 | Data + scheduling engine | Migrations, models, seed data, `app/Scheduling` with unit tests | done 2026-11-23 (59 tests) |
| 3 | App shell | Login (single user), layout, navigation, LT/EN, settings page, theme, Overview page | done 2026-11-23 (56 tests) |
| 4 | Mechanics + customers | Mechanics, time off, closures; customers and vehicles with search | done 2026-11-23 (73 tests) |
| 5 | Calendar | Month / week / day, job bars, lanes, free row, new job, job drawer, find a slot | done 2026-11-23 (98 tests) |
| 6 | Changes | Move, duration, status, warnings, "could move earlier", "customer to contact", activity log, Jobs list | done 2026-11-23 (inspector in phase 5, Jobs list with filters and search) |
| 7 | Job card + invoice | Print layouts, job lines, invoice issue/void, numbering | done 2026-11-23 (112 tests): job page with labour and parts lines, A4 job card, VAT invoice, void and re-issue, Invoices list |
| 8 | PWA + polish | Manifest, icons, service worker, mobile pass, accessibility pass | done 2026-11-24 (114 tests): installable with the MA icon, offline notice page, visible keyboard focus, skip link, branded login |
| 9 | Deploy + handover | Hostinger subdomain, SSL, backups, real data, switch to Lithuanian, short guide for the owner | steps written in DEPLOY.md; waiting for SSH access and the client's company details |

## Working rules

- Scope is fixed (see SCOPE.md). New requests go to a v2 list.
- Scheduling rules change only together with `docs/SCHEDULING_RULES.md` and the tests.
- Every phase: tests green, checked in a real browser at desktop and phone width, in both languages.
