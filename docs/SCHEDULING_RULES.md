# Scheduling rules

This is the source of truth for the maths. `app/Scheduling/*` implements it and `tests/Unit/Scheduling/*` checks it.
If a rule changes, change this file, the tests and the code together.

## Quarters

The working day is split into quarters. A quarter is the smallest unit of time in the app.

| Day | Hours | Quarters | Quarter start times |
|---|---|---|---|
| Mon–Fri | 08:00–18:00 | 4 × 2.5 h | 08:00, 10:30, 13:00, 15:30 |
| Saturday | 09:00–14:00 | 2 × 2.5 h | 09:00, 11:30 |
| Sunday | closed | 0 | — |
| Workshop closed day | closed | 0 | — |

Hours and quarter counts are stored in settings, not hard-coded, but quarter length stays 2.5 h in v1.

## Positions

Every working quarter has a **position**: day + quarter number (0-based).
A job is stored as `start_date`, `start_quarter`, `duration_quarters`.

To find where a job ends, walk forward through **workshop working quarters** only:
Sundays and workshop closed days have no quarters, so they are skipped.

Example: a job starts Saturday 09:00 and lasts 4 quarters.
Saturday has 2 (09:00, 11:30), Sunday has 0, so it ends after Monday's 2nd quarter, at Monday 13:00.

## Mechanic availability

A mechanic is available on a day when all of these are true:

1. the workshop is open that day,
2. the weekday is one of the mechanic's working days,
3. no holiday, day off or sick leave covers that date.

Availability does **not** change where a job ends (see "Our own decisions" in SCOPE.md).
It only produces a warning.

## Occupancy and warnings

A mechanic's quarter is **occupied** by every job of theirs that covers it, except jobs with status
`waiting_parts`. Completed jobs keep occupying the time they actually took.

A job gets a warning when:

- **overlap**: another blocking job of the same mechanic covers one of its quarters, or
- **mechanic off**: one of its quarters falls on a day the mechanic is not available.

Completed and waiting-for-parts jobs never get warnings. Warnings never block saving.

## Find a free slot

Input: duration (quarters), vehicle type, optional mechanic.
For each mechanic who works on that vehicle type, search forward from **now** (the next quarter boundary)
for the first run of consecutive positions that are available and not occupied.
A run can cross Sunday or a closed day (they have no positions), but it cannot cross the mechanic's day off.
Search horizon: 26 weeks. Results are sorted earliest first.

## Could move earlier

For each `scheduled` job that starts after now and is not already marked "customer to contact":
search the earliest free run for **its own mechanic**, ignoring the job itself.
If that run starts on an earlier **day**, the job is a candidate. Show at most one candidate per mechanic
(the earliest booking), so the list does not show every later job for the same gap.

Pressing **Move** puts the job at the suggested position and marks "customer to contact".
Nothing happens without that press.

## Customer to contact

`notify_customer` is set to `earlier` or `later` when the owner changes a job's start **date**
(through any route: drag, form, "Move" in the suggestion list). It is cleared by "Customer informed",
which also records who and when in the activity log.
Changing only the mechanic, the start quarter on the same day, or the duration does not set it.

**Undo** right after a move puts the job back where it was, with the flag it had before the move
(so moving a job and undoing it leaves nobody to call). It only works while the move is the job's last change.

## Duration changes

Buttons: −¼, +¼, +½, +1 day, +2 days, or an exact value. Minimum 1 quarter.
`planned_quarters` keeps the first booked duration, so the UI can show "Extended +½ d".

"Completed now" on an in-progress job sets status `completed` and shortens the duration so the job ends
at the end of the current quarter (never shorter than 1 quarter).

## "Now"

Uses the workshop's time zone, `Europe/Vilnius`. The current quarter is the one that contains the current time;
"from now" searches start at the next quarter boundary.
