<?php

namespace App\Support;

use App\Enums\WorkOrderStatus;
use App\Models\Closure;
use App\Models\Mechanic;
use App\Models\TimeOff;
use App\Models\WorkOrder;
use App\Scheduling\Availability;
use App\Scheduling\Position;
use App\Scheduling\Schedule;
use App\Scheduling\WorkCalendar;
use DateTimeImmutable;
use Illuminate\Support\Facades\Date;

/**
 * Builds the scheduling objects from the database for one request.
 */
final class Workshop
{
    /** Jobs that started this long ago can still matter (long jobs, warnings). */
    private const LOOKBACK_DAYS = 120;

    private ?WorkCalendar $calendar = null;

    private ?Availability $availability = null;

    public function calendar(): WorkCalendar
    {
        return $this->calendar ??= new WorkCalendar(
            self::hours(),
            Closure::query()->orderBy('date')->get()->mapWithKeys(fn (Closure $c) => [$c->date->format('Y-m-d') => $c->name])->all(),
        );
    }

    public function availability(): Availability
    {
        return $this->availability ??= new Availability(
            $this->calendar(),
            Mechanic::query()->get()->mapWithKeys(fn (Mechanic $m) => [$m->id => array_map('intval', $m->work_days ?? [])])->all(),
            TimeOff::query()->get()->map(fn (TimeOff $t) => [
                'mechanic' => $t->mechanic_id,
                'from' => $t->starts_on->format('Y-m-d'),
                'to' => $t->ends_on->format('Y-m-d'),
                'type' => $t->type->value,
            ])->all(),
        );
    }

    /** Every job that can still affect the calendar. */
    public function schedule(): Schedule
    {
        $since = WorkCalendar::addDays($this->today(), -self::LOOKBACK_DAYS);
        $jobs = WorkOrder::query()
            ->where('start_date', '>=', $since)
            ->orWhere('status', '!=', WorkOrderStatus::Completed->value)
            ->get()
            ->map(fn (WorkOrder $w) => $w->toScheduled());

        return new Schedule($this->calendar(), $this->availability(), $jobs);
    }

    public function localNow(): DateTimeImmutable
    {
        return Date::now()->setTimezone(config('workshop.timezone'))->toDateTimeImmutable();
    }

    public function today(): string
    {
        return $this->localNow()->format('Y-m-d');
    }

    /** Searches "from now" start at the next quarter boundary. */
    public function nextQuarter(): Position
    {
        return $this->calendar()->nextBoundary($this->localNow());
    }

    /** The quarter running right now (or the next one when closed). */
    public function currentQuarter(): Position
    {
        return $this->calendar()->positionAt($this->localNow());
    }

    /** @return array<int, array{open: string, quarters: int}> */
    public static function hours(): array
    {
        $hours = [];
        foreach ((array) Settings::get('hours') as $day => $h) {
            $hours[(int) $day] = ['open' => (string) $h['open'], 'quarters' => (int) $h['quarters']];
        }

        return $hours;
    }
}
