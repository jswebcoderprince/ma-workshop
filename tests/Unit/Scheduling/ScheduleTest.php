<?php

namespace Tests\Unit\Scheduling;

use App\Scheduling\Availability;
use App\Scheduling\Position;
use App\Scheduling\Schedule;
use App\Scheduling\ScheduledJob;
use App\Scheduling\WorkCalendar;
use PHPUnit\Framework\TestCase;

// 2026-11-23 is a Monday. Mechanic 1 works Mon–Sat, mechanic 2 Mon–Fri only.
class ScheduleTest extends TestCase
{
    private WorkCalendar $cal;

    protected function setUp(): void
    {
        $this->cal = WorkCalendar::standard(['2026-12-24' => 'Kūčios']);
    }

    /** @param list<ScheduledJob> $jobs */
    private function schedule(array $jobs, array $timeOff = []): Schedule
    {
        $avail = new Availability($this->cal, [1 => [1, 2, 3, 4, 5, 6], 2 => [1, 2, 3, 4, 5]], $timeOff);

        return new Schedule($this->cal, $avail, $jobs);
    }

    private function job(int $id, int $mech, string $date, int $q, int $dur, string $status = ScheduledJob::SCHEDULED, ?string $notify = null): ScheduledJob
    {
        return new ScheduledJob($id, $mech, new Position($date, $q), $dur, $status, $notify);
    }

    public function test_availability_uses_work_days_and_time_off(): void
    {
        $avail = new Availability($this->cal, [1 => [1, 2, 3, 4, 5]], [
            ['mechanic' => 1, 'from' => '2026-12-07', 'to' => '2026-12-11', 'type' => 'holiday'],
        ]);
        $this->assertTrue($avail->isAvailable(1, '2026-11-23'));
        $this->assertFalse($avail->isAvailable(1, '2026-11-28'));
        $this->assertSame(Availability::NOT_WORKING, $avail->offReason(1, '2026-11-28'));
        $this->assertSame('holiday', $avail->offReason(1, '2026-12-07'));
        $this->assertSame('holiday', $avail->offReason(1, '2026-12-11'));
        $this->assertNull($avail->offReason(1, '2026-12-14'));
        $this->assertFalse($avail->isAvailable(1, '2026-12-24'), 'workshop closed');
    }

    public function test_overlap_warning_on_both_jobs(): void
    {
        $s = $this->schedule([
            $this->job(1, 1, '2026-11-23', 0, 4),
            $this->job(2, 1, '2026-11-23', 3, 2),
            $this->job(3, 1, '2026-11-24', 1, 1),
        ]);
        $this->assertSame(Schedule::OVERLAP, $s->warning(1));
        $this->assertSame(Schedule::OVERLAP, $s->warning(2));
        $this->assertNull($s->warning(3));
    }

    public function test_waiting_for_parts_does_not_block_or_warn(): void
    {
        $s = $this->schedule([
            $this->job(1, 1, '2026-11-23', 0, 4, ScheduledJob::WAITING_PARTS),
            $this->job(2, 1, '2026-11-23', 0, 2, ScheduledJob::IN_PROGRESS),
        ]);
        $this->assertNull($s->warning(1));
        $this->assertNull($s->warning(2));
        $this->assertTrue($s->isFree(1, new Position('2026-11-23', 3)));
    }

    public function test_completed_jobs_hold_time_but_never_warn(): void
    {
        $s = $this->schedule([
            $this->job(1, 1, '2026-11-23', 0, 2, ScheduledJob::COMPLETED),
            $this->job(2, 1, '2026-11-23', 1, 2),
        ]);
        $this->assertNull($s->warning(1));
        $this->assertSame(Schedule::OVERLAP, $s->warning(2));
    }

    public function test_job_on_mechanics_day_off_warns(): void
    {
        $s = $this->schedule(
            [$this->job(1, 2, '2026-11-27', 2, 4)], // Fri 13:00 + 1 day: runs into Saturday, mechanic 2 does not work Saturdays
        );
        $this->assertSame(Schedule::MECHANIC_OFF, $s->warning(1));

        $s = $this->schedule(
            [$this->job(1, 1, '2026-12-04', 0, 8)],
            [['mechanic' => 1, 'from' => '2026-12-05', 'to' => '2026-12-05', 'type' => 'day_off']],
        );
        $this->assertSame(Schedule::MECHANIC_OFF, $s->warning(1));
    }

    public function test_check_a_new_booking(): void
    {
        $s = $this->schedule([$this->job(1, 1, '2026-11-24', 0, 4)]);
        $this->assertSame(Schedule::OVERLAP, $s->check(1, new Position('2026-11-23', 3), 2));
        $this->assertNull($s->check(1, new Position('2026-11-23', 2), 2));
        $this->assertNull($s->check(1, new Position('2026-11-24', 0), 4, ignoreJobId: 1));
    }

    public function test_earliest_free_slot_finds_the_first_gap_that_fits(): void
    {
        $s = $this->schedule([
            $this->job(1, 1, '2026-11-23', 0, 2),
            $this->job(2, 1, '2026-11-23', 3, 4), // leaves one free quarter at Mon q2
        ]);
        $from = new Position('2026-11-23', 0);
        $this->assertEquals(new Position('2026-11-23', 2), $s->earliest(1, 1, $from));
        $this->assertEquals(new Position('2026-11-24', 3), $s->earliest(1, 2, $from));
    }

    public function test_earliest_crosses_sunday_but_not_a_day_off(): void
    {
        $s = $this->schedule([]);
        // Mechanic 1 from Sat 09:00: Sat (2) + Mon (2) is one run across Sunday.
        $this->assertEquals(new Position('2026-11-28', 0), $s->earliest(1, 4, new Position('2026-11-28', 0)));
        // Mechanic 2 does not work Saturdays: the run starts Monday.
        $this->assertEquals(new Position('2026-11-30', 0), $s->earliest(2, 4, new Position('2026-11-28', 0)));

        $s = $this->schedule([], [['mechanic' => 1, 'from' => '2026-11-24', 'to' => '2026-11-24', 'type' => 'holiday']]);
        // Mon q2 + q3 free, Tue off: a 3-quarter job cannot bridge the holiday.
        $this->assertEquals(new Position('2026-11-25', 0), $s->earliest(1, 3, new Position('2026-11-23', 2)));
    }

    public function test_earliest_can_ignore_the_job_being_moved(): void
    {
        $s = $this->schedule([$this->job(1, 1, '2026-11-23', 0, 4)]);
        $from = new Position('2026-11-23', 0);
        $this->assertEquals(new Position('2026-11-24', 0), $s->earliest(1, 4, $from));
        $this->assertEquals($from, $s->earliest(1, 4, $from, ignoreJobId: 1));
    }

    public function test_could_move_earlier_suggests_one_booking_per_gap(): void
    {
        $s = $this->schedule([
            $this->job(1, 1, '2026-11-23', 0, 2, ScheduledJob::COMPLETED), // finished early
            $this->job(2, 1, '2026-11-25', 0, 4),                           // gap Mon q2 … Tue q3 before it
            $this->job(3, 1, '2026-11-26', 0, 2),
            $this->job(4, 2, '2026-11-23', 0, 8, ScheduledJob::IN_PROGRESS), // mechanic 2 is full, no gap
            $this->job(5, 2, '2026-11-25', 0, 4),
        ]);
        $now = new Position('2026-11-23', 2);
        $c = $s->earlierCandidates($now);
        $this->assertCount(1, $c);
        $this->assertSame(2, $c[0]['job']->id);
        $this->assertEquals(new Position('2026-11-23', 2), $c[0]['to']);
    }

    public function test_could_move_earlier_skips_jobs_already_flagged_or_started(): void
    {
        $s = $this->schedule([
            $this->job(2, 1, '2026-11-25', 0, 4, ScheduledJob::SCHEDULED, 'later'),
            $this->job(3, 1, '2026-11-26', 0, 2, ScheduledJob::IN_PROGRESS),
        ]);
        $this->assertSame([], $s->earlierCandidates(new Position('2026-11-23', 0)));
    }

    public function test_same_day_gain_is_not_suggested(): void
    {
        $s = $this->schedule([$this->job(1, 1, '2026-11-23', 3, 1)]);
        $this->assertSame([], $s->earlierCandidates(new Position('2026-11-23', 0)));
    }

    public function test_free_quarters_per_day(): void
    {
        $s = $this->schedule([$this->job(1, 1, '2026-11-23', 0, 3)]);
        $this->assertSame(1 + 4, $s->freeQuarters([1, 2], '2026-11-23'));
        $this->assertSame(1 + 2, $s->freeQuarters([1, 2], '2026-11-23', new Position('2026-11-23', 2)));
        $this->assertSame(2, $s->freeQuarters([1, 2], '2026-11-28'), 'Saturday: only mechanic 1');
    }
}
