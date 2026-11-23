# Deploy to Hostinger (`workshop.maenginelab.lt`)

Waiting for SSH access to the client's Hostinger plan. Everything below can be done in one sitting once it arrives.

## Once

1. **hPanel → Domains → Subdomains:** create `workshop.maenginelab.lt`. Point its document root at
   `domains/maenginelab.lt/workshop/public` (Laravel's `public/`, not the project root).
2. **hPanel → Advanced → PHP configuration:** PHP **8.3** for the subdomain (Composer's lock needs 8.3).
3. **hPanel → Databases → MySQL:** new database and user. Note the names (Hostinger prefixes them, e.g. `u123_workshop`).
4. **SSL:** hPanel → Security → SSL → install the free certificate for the subdomain, then force HTTPS.
5. Upload the code (git clone over SSH, or zip without `node_modules`, `vendor`, `.env`, `storage/logs/*`).
   `public/build` is built on our side (`npm run build`) and uploaded with the code: Hostinger shared plans have no Node.
6. On the server, in the project folder:

   ```sh
   composer install --no-dev --optimize-autoloader
   cp .env.example .env          # then edit, see below
   php artisan key:generate
   php artisan migrate --force
   php artisan db:seed --force   # owner login + Lithuanian public holidays; no demo data
   php artisan config:cache && php artisan route:cache && php artisan view:cache
   ```

### `.env` on the server

```ini
APP_ENV=production
APP_DEBUG=false
APP_URL=https://workshop.maenginelab.lt
WORKSHOP_TIMEZONE=Europe/Vilnius
DB_DATABASE=...   DB_USERNAME=...   DB_PASSWORD=...
OWNER_NAME="..."             # the owner's name, shown in the app
OWNER_EMAIL=...              # his login
OWNER_PASSWORD=              # leave empty: a random one is printed once by db:seed; give it to him and he changes it
SEED_DEMO=false              # never true on the live site
SESSION_SECURE_COOKIE=true
```

## Before handing over

- Settings → General → **Lietuvių** (the app is delivered in Lithuanian).
- Settings → Company: legal name, company code, VAT code, address, bank account (from the client, see SCOPE.md).
- Settings → Invoices: VAT payer yes/no, rate, series `MAE`, next number `1`. Hourly rate.
- Mechanics: real names, vehicle types, working days.
- Print one invoice and send it to the client's accountant (SCOPE.md).
- On a phone: open the site, "Add to Home screen", check it opens full screen with the MA icon.

## Updates later

```sh
git pull                      # or upload the changed files, including public/build
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan optimize:clear && php artisan config:cache && php artisan route:cache && php artisan view:cache
```

After a release with new JS or CSS, `public/sw.js` does not need changes: built files have new names.
Change `CACHE` in `sw.js` only when `offline.html` or the icons change.

## Backups

Hostinger makes daily backups of files and databases (hPanel → Files → Backups). Before each update, also download
a database export (hPanel → Databases → phpMyAdmin → Export), because invoices must never be lost.
