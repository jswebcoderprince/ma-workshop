<?php

namespace App\Http\Controllers;

use App\Enums\WorkOrderStatus;
use App\Models\Mechanic;
use App\Models\WorkOrder;
use App\Scheduling\WorkCalendar;
use App\Support\JobView;
use App\Support\Workshop;
use Inertia\Inertia;
use Inertia\Response;

/** Landing page: how full the workshop is, who is free next, what needs attention. */
class OverviewController extends Controller
{
    private const WEEKS = 8;

    public function __invoke(Workshop $workshop): Response
    {
        $schedule = $workshop->schedule();
        $cal = $schedule->calendar;
        $now = $workshop->currentQuarter();
        $next = $workshop->nextQuarter();
        $today = $workshop->today();
        $monday = WorkCalendar::addDays($today, 1 - WorkCalendar::weekday($today));

        $mechanics = Mechanic::query()->where('active', true)->ordered()->get();
        $ids = $mechanics->pluck('id')->all();

        $workload = [];
        for ($w = 0; $w < self::WEEKS; $w++) {
            $from = WorkCalendar::addDays($monday, 7 * $w);
            $u = $schedule->utilisation($ids, $from, WorkCalendar::addDays($from, 7), $now);
            $workload[] = ['week' => (int) date('W', strtotime($from)), 'from' => $from] + $u;
        }

        // Earliest 1-day slot for a car, the most common question on the phone.
        $nextFree = $mechanics->filter(fn (Mechanic $m) => $m->worksOn('car'))
            ->map(fn (Mechanic $m) => ['mechanic' => $m->name, 'at' => $schedule->earliest($m->id, 4, $next)])
            ->filter(fn ($r) => $r['at'] !== null)
            ->sortBy(fn ($r) => $r['at']->key())
            ->first();

        $jobs = WorkOrder::query()->with(['customer', 'vehicle', 'mechanic'])->get();
        $upcoming = $jobs->where('status', '!=', WorkOrderStatus::Completed)
            ->sortBy(fn (WorkOrder $w) => $w->startPosition()->key().'#'.str_pad((string) $w->id, 8, '0', STR_PAD_LEFT))
            ->take(7)->values();

        return Inertia::render('overview', [
            'stats' => [
                'bookedThisWeek' => self::percent($workload[0]),
                'bookedNextWeek' => self::percent($workload[1]),
                'nextFree' => $nextFree ? [
                    'date' => $nextFree['at']->date,
                    'time' => $cal->quarterStart($nextFree['at']->date, $nextFree['at']->quarter),
                    'mechanic' => $nextFree['mechanic'],
                ] : null,
                'waitingParts' => $jobs->where('status', WorkOrderStatus::WaitingParts)->count(),
                'toCall' => $jobs->whereNotNull('notify_customer')->count(),
                'earlier' => count($schedule->earlierCandidates($next)),
                'overlaps' => $jobs->filter(fn (WorkOrder $w) => $schedule->warning($w->id) !== null)->count(),
            ],
            'workload' => $workload,
            'mechanics' => $mechanics->map(function (Mechanic $m) use ($schedule, $monday, $now, $next) {
                $u = $schedule->utilisation([$m->id], $monday, WorkCalendar::addDays($monday, 28), $now);
                $free = $schedule->earliest($m->id, 4, $next);

                return JobView::mechanic($m) + ['load' => self::percent($u), 'nextFree' => $free?->date];
            })->values(),
            'upcoming' => $upcoming->map(fn (WorkOrder $w) => JobView::row($w, $schedule))->values(),
        ]);
    }

    /** @param  array{available: int, booked: int}  $u */
    private static function percent(array $u): int
    {
        return $u['available'] > 0 ? (int) round($u['booked'] / $u['available'] * 100) : 0;
    }
}
