<?php

namespace App\Scheduling;

use DateTimeImmutable;
use DateTimeZone;
use LogicException;

/**
 * The workshop's working quarters: which days are open, how many quarters each day has,
 * and how to walk from one quarter to the next. See docs/SCHEDULING_RULES.md.
 */
final class WorkCalendar
{
    public const QUARTER_MINUTES = 150;

    /** Guard against a calendar with no open days at all. */
    private const MAX_EMPTY_DAYS = 400;

    /** @var array<string, int> */
    private array $quarterCache = [];

    /**
     * @param  array<int, array{open: string, quarters: int}>  $hours  ISO weekday (1 = Monday … 7 = Sunday) => opening time and quarter count
     * @param  array<string, string>  $closures  Y-m-d => name of the closed day
     */
    public function __construct(
        private readonly array $hours,
        private readonly array $closures = [],
    ) {}

    /**
     * Mon–Fri 08:00–18:00 (4 quarters), Sat 09:00–14:00 (2 quarters), Sunday closed.
     *
     * @param  array<string, string>  $closures
     */
    public static function standard(array $closures = []): self
    {
        $weekday = ['open' => '08:00', 'quarters' => 4];

        return new self([
            1 => $weekday, 2 => $weekday, 3 => $weekday, 4 => $weekday, 5 => $weekday,
            6 => ['open' => '09:00', 'quarters' => 2],
            7 => ['open' => '00:00', 'quarters' => 0],
        ], $closures);
    }

    public function quartersOn(string $date): int
    {
        return $this->quarterCache[$date] ??= isset($this->closures[$date])
            ? 0
            : (int) ($this->hours[self::weekday($date)]['quarters'] ?? 0);
    }

    public function isOpen(string $date): bool
    {
        return $this->quartersOn($date) > 0;
    }

    public function closureName(string $date): ?string
    {
        return $this->closures[$date] ?? null;
    }

    public function isValid(Position $p): bool
    {
        return $p->quarter >= 0 && $p->quarter < $this->quartersOn($p->date);
    }

    /** The first valid position at or after $p. */
    public function normalize(Position $p): Position
    {
        if ($p->quarter < 0) {
            $p = new Position($p->date, 0);
        }

        return $this->isValid($p) ? $p : $this->firstOn(self::addDays($p->date, 1));
    }

    /** The position directly after $p. */
    public function next(Position $p): Position
    {
        return $p->quarter + 1 < $this->quartersOn($p->date)
            ? new Position($p->date, $p->quarter + 1)
            : $this->firstOn(self::addDays($p->date, 1));
    }

    /**
     * Every position a job covers, in order. Closed days are skipped.
     *
     * @return list<Position>
     */
    public function span(Position $start, int $duration): array
    {
        $p = $this->normalize($start);
        $out = [$p];
        for ($i = 1; $i < max(1, $duration); $i++) {
            $out[] = $p = $this->next($p);
        }

        return $out;
    }

    /** The last position a job covers. */
    public function end(Position $start, int $duration): Position
    {
        $span = $this->span($start, $duration);

        return $span[count($span) - 1];
    }

    /** Number of positions from $from (included) to $to (excluded). Negative when $to is before $from. */
    public function distance(Position $from, Position $to): int
    {
        $sign = 1;
        if ($to->isBefore($from)) {
            [$from, $to, $sign] = [$to, $from, -1];
        }
        $n = 0;
        for ($p = $this->normalize($from); $p->isBefore($to); $p = $this->next($p)) {
            $n++;
        }

        return $sign * $n;
    }

    /** "HH:MM" when quarter $q starts on $date. */
    public function quarterStart(string $date, int $quarter): string
    {
        [$h, $m] = array_map('intval', explode(':', $this->hours[self::weekday($date)]['open'] ?? '08:00'));
        $minutes = $h * 60 + $m + $quarter * self::QUARTER_MINUTES;

        return sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);
    }

    /** "HH:MM" when quarter $q ends on $date. */
    public function quarterEnd(string $date, int $quarter): string
    {
        return $this->quarterStart($date, $quarter + 1);
    }

    /** The first quarter that starts at or after the given local time. */
    public function nextBoundary(DateTimeImmutable $local): Position
    {
        $date = $local->format('Y-m-d');
        $minutes = (int) $local->format('G') * 60 + (int) $local->format('i');
        for ($q = 0; $q < $this->quartersOn($date); $q++) {
            [$h, $m] = array_map('intval', explode(':', $this->quarterStart($date, $q)));
            if ($h * 60 + $m >= $minutes) {
                return new Position($date, $q);
            }
        }

        return $this->firstOn(self::addDays($date, 1));
    }

    /** The quarter that contains the given local time, or the next one when the workshop is closed. */
    public function positionAt(DateTimeImmutable $local): Position
    {
        $date = $local->format('Y-m-d');
        $minutes = (int) $local->format('G') * 60 + (int) $local->format('i');
        for ($q = 0; $q < $this->quartersOn($date); $q++) {
            [$h, $m] = array_map('intval', explode(':', $this->quarterEnd($date, $q)));
            if ($minutes < $h * 60 + $m) {
                return new Position($date, $q);
            }
        }

        return $this->firstOn(self::addDays($date, 1));
    }

    public static function now(string $timezone): DateTimeImmutable
    {
        return new DateTimeImmutable('now', new DateTimeZone($timezone));
    }

    public static function weekday(string $date): int
    {
        return (int) (new DateTimeImmutable($date.' 00:00:00', new DateTimeZone('UTC')))->format('N');
    }

    public static function addDays(string $date, int $days): string
    {
        return (new DateTimeImmutable($date.' 00:00:00', new DateTimeZone('UTC')))
            ->modify(($days >= 0 ? '+' : '').$days.' day')
            ->format('Y-m-d');
    }

    private function firstOn(string $date): Position
    {
        for ($i = 0; $i < self::MAX_EMPTY_DAYS; $i++) {
            if ($this->isOpen($date)) {
                return new Position($date, 0);
            }
            $date = self::addDays($date, 1);
        }

        throw new LogicException('The workshop calendar has no open day within '.self::MAX_EMPTY_DAYS.' days.');
    }
}
