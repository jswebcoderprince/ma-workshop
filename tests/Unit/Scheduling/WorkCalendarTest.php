<?php

namespace Tests\Unit\Scheduling;

use App\Scheduling\Position;
use App\Scheduling\WorkCalendar;
use DateTimeImmutable;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

// 2026-11-23 is a Monday. 28 = Sat, 29 = Sun.
class WorkCalendarTest extends TestCase
{
    private function cal(): WorkCalendar
    {
        return WorkCalendar::standard([
            '2026-12-24' => 'Kūčios',
            '2026-12-25' => 'Kalėdos',
            '2026-12-26' => 'Antroji Kalėdų diena',
        ]);
    }

    public function test_quarters_per_day(): void
    {
        $c = $this->cal();
        $this->assertSame(4, $c->quartersOn('2026-11-23'));
        $this->assertSame(4, $c->quartersOn('2026-11-27'));
        $this->assertSame(2, $c->quartersOn('2026-11-28'));
        $this->assertSame(0, $c->quartersOn('2026-11-29'));
        $this->assertSame(0, $c->quartersOn('2026-12-24'));
        $this->assertSame('Kalėdos', $c->closureName('2026-12-25'));
    }

    public function test_quarter_times(): void
    {
        $c = $this->cal();
        $this->assertSame(['08:00', '10:30', '13:00', '15:30'], array_map(fn ($q) => $c->quarterStart('2026-11-23', $q), [0, 1, 2, 3]));
        $this->assertSame('18:00', $c->quarterEnd('2026-11-23', 3));
        $this->assertSame(['09:00', '11:30'], [$c->quarterStart('2026-11-28', 0), $c->quarterStart('2026-11-28', 1)]);
        $this->assertSame('14:00', $c->quarterEnd('2026-11-28', 1));
    }

    public function test_saturday_job_continues_on_monday(): void
    {
        // Sat 09:00 + 4 quarters: Sat has 2, Sunday none, so it ends after Monday's 2nd quarter (13:00).
        $end = $this->cal()->end(new Position('2026-11-28', 0), 4);
        $this->assertEquals(new Position('2026-11-30', 1), $end);
    }

    public function test_job_skips_workshop_closed_days(): void
    {
        // Wed 23 Dec 13:00 for 1 day: Thu–Sat closed for Christmas, Sun closed, continues Mon 28 Dec.
        $span = $this->cal()->span(new Position('2026-12-23', 2), 4);
        $this->assertEquals([
            new Position('2026-12-23', 2), new Position('2026-12-23', 3),
            new Position('2026-12-28', 0), new Position('2026-12-28', 1),
        ], $span);
    }

    public function test_single_quarter_job_ends_where_it_starts(): void
    {
        $this->assertEquals(new Position('2026-11-24', 3), $this->cal()->end(new Position('2026-11-24', 3), 1));
    }

    public function test_normalize_moves_invalid_positions_forward(): void
    {
        $c = $this->cal();
        $this->assertEquals(new Position('2026-11-30', 0), $c->normalize(new Position('2026-11-29', 0)));
        $this->assertEquals(new Position('2026-11-30', 0), $c->normalize(new Position('2026-11-28', 2)));
        $this->assertEquals(new Position('2026-11-28', 1), $c->normalize(new Position('2026-11-28', 1)));
    }

    public function test_previous_and_back_skip_closed_days(): void
    {
        $c = $this->cal();
        $this->assertEquals(new Position('2026-11-24', 2), $c->previous(new Position('2026-11-24', 3)));
        // Monday 08:00 → Saturday's last quarter (Sunday is closed).
        $this->assertEquals(new Position('2026-11-28', 1), $c->previous(new Position('2026-11-30', 0)));
        // Mon 28 Dec 08:00 → Wed 23 Dec 15:30 (Christmas closures and Sunday).
        $this->assertEquals(new Position('2026-12-23', 3), $c->previous(new Position('2026-12-28', 0)));
        // back() is the inverse of span(): a 4-quarter job ending Mon 30 q1 starts Sat 28 q0.
        $this->assertEquals(new Position('2026-11-28', 0), $c->back(new Position('2026-11-30', 1), 3));
        $this->assertEquals(new Position('2026-11-30', 1), $c->back(new Position('2026-11-30', 1), 0));
    }

    public function test_distance_counts_working_quarters(): void
    {
        $c = $this->cal();
        // Fri 27 q0 → Mon 30 q0: Fri 4 + Sat 2 = 6
        $this->assertSame(6, $c->distance(new Position('2026-11-27', 0), new Position('2026-11-30', 0)));
        $this->assertSame(-6, $c->distance(new Position('2026-11-30', 0), new Position('2026-11-27', 0)));
        $this->assertSame(0, $c->distance(new Position('2026-11-27', 1), new Position('2026-11-27', 1)));
    }

    /** @return array<string, array{string, string, string}> */
    public static function times(): array
    {
        // local time, position containing it, next boundary
        return [
            'before opening' => ['2026-11-23 07:10', '2026-11-23#0', '2026-11-23#0'],
            'exactly 08:00' => ['2026-11-23 08:00', '2026-11-23#0', '2026-11-23#0'],
            'mid morning' => ['2026-11-23 10:45', '2026-11-23#1', '2026-11-23#2'],
            'last quarter' => ['2026-11-23 17:59', '2026-11-23#3', '2026-11-24#0'],
            'after closing' => ['2026-11-23 18:30', '2026-11-24#0', '2026-11-24#0'],
            'saturday afternoon' => ['2026-11-28 15:00', '2026-11-30#0', '2026-11-30#0'],
            'sunday' => ['2026-11-29 11:00', '2026-11-30#0', '2026-11-30#0'],
        ];
    }

    #[DataProvider('times')]
    public function test_position_at_and_next_boundary(string $time, string $at, string $next): void
    {
        $c = $this->cal();
        $t = new DateTimeImmutable($time);
        $this->assertSame($at, $c->positionAt($t)->key());
        $this->assertSame($next, $c->nextBoundary($t)->key());
    }
}
