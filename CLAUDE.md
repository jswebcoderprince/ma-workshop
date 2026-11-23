# MA Workshop: notes for Claude

Read `docs/SCOPE.md` and `docs/SCHEDULING_RULES.md` before changing behaviour.

- PHP: always `C:/php83/php.exe` (XAMPP's PHP is 8.2 and fails Composer's platform check).
- MySQL comes from XAMPP. If port 3306 is closed, tests and migrations hang silently. Start it with
  `Start-Process 'C:\xampp\mysql\bin\mysqld.exe' -ArgumentList '--standalone','--innodb-use-native-aio=0' -WindowStyle Hidden`.
- Tests run on `ma_workshop_test` (set in `phpunit.xml`), never on the dev database `ma_workshop`.
- A "job" in the UI is `WorkOrder` / `work_orders` in code: Laravel's queue owns the `jobs` table.
- Scheduling maths lives in `app/Scheduling` as plain PHP with unit tests. Change the rule doc, tests and code together.
- The system never moves a booking by itself. Only the owner's actions change dates (client decision 2026-11-22).
- Every UI string goes through `t()` / `__()` with keys in `lang/en.json` and `lang/lt.json`. No hard-coded text.
- Sample data is fictional and must stay labelled as sample data. Company details are placeholders until the client sends real ones.
- Verify UI changes in a real browser at desktop and 390 px width, in both languages.
