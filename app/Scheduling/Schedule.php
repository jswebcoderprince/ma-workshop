<?php

namespace App\Scheduling;

/**
 * A snapshot of all jobs: who is busy when, warnings, free slots and "could move earlier".
 * It never changes a job; it only answers questions. See docs/SCHEDULING_RULES.md.
 */
final class Schedule
{
    public const OVERLAP = 'overlap';

    public const MECHANIC_OFF = 'mechanic_off';

    /** @var array<int, ScheduledJob> */
    private array $jobs = [];

    /** @var array<int, list<Position>> job id => positions */
    private array $spans = [];

    /** @var array<int, array<string, list<int>>> mechanic id => position key => job ids holding it */
    private array $occupied = [];

    /**
     * @param  iterable<ScheduledJob>  $jobs
     */
    public function __construct(
        public readonly WorkCalendar $calendar,
        public readonly Availability $availability,
        iterable $jobs,
    ) {
        foreach ($jobs as $job) {
            $this->jobs[$job->id] = $job;
            $this->spans[$job->id] = $calendar->span($job->start, $job->duration);
            if ($job->blocksTime()) {
                foreach ($this->spans[$job->id] as $p) {
                    $this->occupied[$job->mechanicId][$p->key()][] = $job->id;
                }
            }
        }
    }

    /** @return list<Position> */
    public function span(int $jobId): array
    {
        return $this->spans[$jobId] ?? [];
    }

    public function end(int $jobId): ?Position
    {
        $span = $this->span($jobId);

        return $span === [] ? null : $span[count($span) - 1];
    }

    public function isFree(int $mechanicId, Position $p, ?int $ignoreJobId = null): bool
    {
        $holders = $this->occupied[$mechanicId][$p->key()] ?? [];

        return $holders === [] || $holders === [$ignoreJobId];
    }

    /** overlap, mechanic_off or null. Warnings never block saving. */
    public function warning(int $jobId): ?string
    {
        $job = $this->jobs[$jobId] ?? null;
        if ($job === null || ! $job->canWarn()) {
            return null;
        }

        $off = false;
        foreach ($this->spans[$jobId] as $p) {
            if (! $this->isFree($job->mechanicId, $p, $jobId)) {
                return self::OVERLAP;
            }
            $off = $off || ! $this->availability->isAvailable($job->mechanicId, $p->date);
        }

        return $off ? self::MECHANIC_OFF : null;
    }

    /**
     * Would a job of $duration quarters starting at $start overlap something or fall on a day off?
     */
    public function check(int $mechanicId, Position $start, int $duration, ?int $ignoreJobId = null): ?string
    {
        $off = false;
        foreach ($this->calendar->span($start, $duration) as $p) {
            if (! $this->isFree($mechanicId, $p, $ignoreJobId)) {
                return self::OVERLAP;
            }
            $off = $off || ! $this->availability->isAvailable($mechanicId, $p->date);
        }

        return $off ? self::MECHANIC_OFF : null;
    }

    /**
     * First start from $from where the mechanic is available and free for $duration quarters in a row.
     */
    public function earliest(int $mechanicId, int $duration, Position $from, ?int $ignoreJobId = null, int $horizonDays = 182): ?Position
    {
        $limit = WorkCalendar::addDays($from->date, $horizonDays);
        $run = 0;
        $start = null;
        for ($p = $this->calendar->normalize($from); $p->date <= $limit; $p = $this->calendar->next($p)) {
            if ($this->availability->isAvailable($mechanicId, $p->date) && $this->isFree($mechanicId, $p, $ignoreJobId)) {
                $start = $run === 0 ? $p : $start;
                if (++$run >= $duration) {
                    return $start;
                }
            } else {
                $run = 0;
            }
        }

        return null;
    }

    /**
     * Scheduled jobs that could start on an earlier day with the same mechanic.
     * One per mechanic (their earliest booking), so one gap does not list every later job.
     *
     * @return list<array{job: ScheduledJob, to: Position}>
     */
    public function earlierCandidates(Position $now): array
    {
        $jobs = array_values(array_filter(
            $this->jobs,
            fn (ScheduledJob $j) => $j->status === ScheduledJob::SCHEDULED
                && $j->notify === null
                && $now->isBefore($j->start),
        ));
        usort($jobs, fn (ScheduledJob $a, ScheduledJob $b) => $a->start->compare($b->start) ?: $a->id <=> $b->id);

        $out = [];
        $seen = [];
        foreach ($jobs as $job) {
            if (isset($seen[$job->mechanicId])) {
                continue;
            }
            $to = $this->earliest($job->mechanicId, $job->duration, $now, $job->id);
            if ($to !== null && $to->date < $job->start->date) {
                $out[] = ['job' => $job, 'to' => $to];
                $seen[$job->mechanicId] = true;
            }
        }

        return $out;
    }

    /**
     * Mechanic quarters available and booked between two dates ($to excluded), counting only positions from $since on.
     *
     * @param  list<int>  $mechanicIds
     * @return array{available: int, booked: int}
     */
    public function utilisation(array $mechanicIds, string $from, string $to, ?Position $since = null): array
    {
        $available = 0;
        $booked = 0;
        for ($date = $from; $date < $to; $date = WorkCalendar::addDays($date, 1)) {
            for ($q = 0; $q < $this->calendar->quartersOn($date); $q++) {
                $p = new Position($date, $q);
                if ($since !== null && $p->isBefore($since)) {
                    continue;
                }
                foreach ($mechanicIds as $m) {
                    if ($this->availability->isAvailable($m, $date)) {
                        $available++;
                        $booked += $this->isFree($m, $p) ? 0 : 1;
                    }
                }
            }
        }

        return ['available' => $available, 'booked' => $booked];
    }

    /** Free quarters across the given mechanics on $date, counting only positions from $from on. */
    public function freeQuarters(array $mechanicIds, string $date, ?Position $from = null): int
    {
        $free = 0;
        for ($q = 0; $q < $this->calendar->quartersOn($date); $q++) {
            $p = new Position($date, $q);
            if ($from !== null && $p->isBefore($from)) {
                continue;
            }
            foreach ($mechanicIds as $m) {
                if ($this->availability->isAvailable($m, $date) && $this->isFree($m, $p)) {
                    $free++;
                }
            }
        }

        return $free;
    }
}
