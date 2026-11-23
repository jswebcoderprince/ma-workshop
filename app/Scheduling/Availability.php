<?php

namespace App\Scheduling;

/**
 * Whether a mechanic works on a given date: workshop open, their weekday, no time off.
 */
final class Availability
{
    public const NOT_WORKING = 'not_working';

    /**
     * @param  array<int, list<int>>  $workDays  mechanic id => ISO weekdays they work
     * @param  list<array{mechanic: int, from: string, to: string, type: string}>  $timeOff  inclusive date ranges
     */
    public function __construct(
        private readonly WorkCalendar $calendar,
        private readonly array $workDays,
        private readonly array $timeOff = [],
    ) {}

    /** Why the mechanic is off on $date (holiday, day_off, sick, not_working), or null when they work. */
    public function offReason(int $mechanicId, string $date): ?string
    {
        foreach ($this->timeOff as $off) {
            if ($off['mechanic'] === $mechanicId && $date >= $off['from'] && $date <= $off['to']) {
                return $off['type'];
            }
        }

        $days = $this->workDays[$mechanicId] ?? [];

        return in_array(WorkCalendar::weekday($date), $days, true) ? null : self::NOT_WORKING;
    }

    public function isAvailable(int $mechanicId, string $date): bool
    {
        return $this->calendar->isOpen($date) && $this->offReason($mechanicId, $date) === null;
    }
}
