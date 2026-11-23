# Scope: version 1

Client: MA Engine Lab, Prienai, Lithuania (contact: Mr. Ash). The project came to us through Bashar.
A garage that repairs cars, motorcycles and watercraft. It has a waiting list of about 3 weeks.

**Goal.** When a customer calls, the owner can see straight away which mechanic is free and when,
book the job, and keep the schedule correct when work runs over or finishes early.

## Who uses it

One person: the owner. He manages every job, status and date himself.
Mechanics do not log in. They get a printed job card.

## In version 1

| Area | What it does |
|---|---|
| Overview | Landing page: booked share this week and next, next free day, jobs waiting for parts, customers to call, workload chart for the next 8 weeks, mechanics' load, upcoming jobs. Added 2026-11-23 with the v3 design. |
| Calendar | Month view (5 weeks, rolling from the current week) is the main view. Week and day views as well. One row per mechanic. |
| Quarter-day scheduling | Mon–Fri = 4 quarters of 2.5 h (08:00–18:00). Sat = 2 quarters (09:00–14:00). Sunday closed. Every job starts on a quarter and lasts a whole number of quarters. |
| Jobs | Customer, vehicle, description of the work, mechanic, start, duration, status. |
| Statuses | Scheduled, In progress, Waiting for parts, Completed. |
| Manual changes only | The system never moves a booking by itself. The owner extends, shortens, moves or reassigns jobs. |
| Overlap warning | If a change makes two jobs of one mechanic overlap, or puts a job on a mechanic's day off, it is allowed but shown with a warning. |
| Could move earlier | When a job finishes early or a gap opens, the system lists bookings that could start earlier. The owner decides and moves them. |
| Customer to contact | Moving a booking to another date marks it "customer to contact" (highlighted). It stays highlighted until the owner presses "Customer informed". |
| Find a free slot | Enter duration and vehicle type: shows the earliest free slot for each mechanic. Read-only, nothing is booked until the owner saves. |
| Holidays and days off | Per mechanic, by date range (holiday, day off, sick leave). Workshop closed days (public holidays) for everyone. |
| Mechanic working days | Each mechanic has their own weekdays (for example no Saturdays). |
| Customers and vehicles | Stored and reused. Search by name, phone or plate. A customer can have several vehicles. |
| Job card | Printable A4 sheet from any job: customer, vehicle, work, mechanic, planned dates, blank lines for parts and notes, signatures. |
| Invoice | From a job: labour and parts lines with prices, VAT (PVM), totals, invoice number, company and customer details. Print or save as PDF. |
| Activity history | Who changed what and when (dates, durations, statuses). |
| Languages | Lithuanian and English. Switched in Settings. Delivered in Lithuanian. |
| Install on phone | Works in any browser and can be installed to the home screen (PWA). |

## Not in version 1

Agreed with the client as later work:

- Website enquiry integration (bookings from maenginelab.lt).
- Mechanic logins or updates from mechanics' phones.
- Credit notes, payment tracking, emailing invoices, accounting exports.
- Automatic rescheduling of any kind.
- Lifts and bays (dropped by the client after the first prototype).
- Offline mode, SMS or email reminders to customers.

Anything new goes to version 2 with its own estimate.

## Decisions log

| Date | Decision | Source |
|---|---|---|
| 2026-11-22 | Drop lifts and bays; focus on mechanics, jobs and durations. | Client feedback on prototype |
| 2026-11-22 | Holidays and days off per mechanic. Month view at minimum. | Client feedback |
| 2026-11-22 | Quarter-day steps for durations and extensions. | Client feedback |
| 2026-11-22 | No automatic rescheduling, no locking: the owner moves everything. | Client answers 3 and 4 (replaces his earlier request for automatic moving) |
| 2026-11-22 | A mechanic can have several open jobs but works on one at a time. | Client answer 1 |
| 2026-11-22 | Only the owner updates the schedule. | Client answer 2 |
| 2026-11-22 | Store customer contact and vehicle details for reuse. | Client answer 5 |
| 2026-11-22 | Website enquiries later; v1 is internal scheduling. | Client answer 6 |
| 2026-11-23 | "Could move earlier" is a suggestion list; moved bookings stay highlighted until "Customer informed". Overlaps allowed with a warning. Saturday = 2 quarters. | Client: "Yea that sounds good. Do as you think its the best." |
| 2026-11-23 | Add job cards and simple invoices (see table above). | Client request + our reply |
| 2026-11-23 | Standalone Laravel + React web app on `workshop.maenginelab.lt`, client's existing Hostinger plan. | Internal |
| 2026-11-23 | UI in Lithuanian and English, switch in Settings. English during development, Lithuanian on delivery. | Internal |

## Our own decisions (client said "do as you think best")

These follow from the rules above. Change them here if the client disagrees.

- A job **waiting for parts** does not block the mechanic's time. It stays visible (striped amber) but other jobs can use that time.
- A job's end date only skips days the **workshop** is closed. If it runs into the mechanic's own day off, that is shown as a warning, not moved.
- Moving a booking to another date sets "customer to contact" in both directions (earlier and later). Changing only the mechanic does not.
- "Completed now" on a job in progress shortens it to the current quarter. That is what opens the gap for "Could move earlier".
- Invoice numbers: one series (default `MAE`), starting at 0001, never reused. An issued invoice cannot be edited, only voided.
- A voided invoice stays on record with its number. The job's lines unlock, and a new invoice gets the next number.
  A job that ever had an invoice cannot be deleted.
- Line prices are typed without VAT. VAT (Settings, default 21 %) is worked out once on the invoice total.
- The job card has no prices: it is for the mechanic, with empty rows for parts and notes written by hand.

## Still to get from the client (before delivery, does not block development)

- Company legal name, company code, VAT payer yes/no, VAT code, address, bank account, logo.
- Mechanic names, what vehicles each works on, their working days.
- Whether the invoice should show the amount in words (common in Lithuania, not required).
- Ask their accountant to look at one sample invoice before go-live.
