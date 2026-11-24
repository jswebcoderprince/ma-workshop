<?php

namespace App\Http\Controllers;

use App\Enums\WorkOrderStatus;
use App\Models\Mechanic;
use App\Models\Vehicle;
use App\Models\WorkOrder;
use App\Scheduling\Availability;
use App\Scheduling\Position;
use App\Scheduling\Schedule;
use App\Scheduling\WorkCalendar;
use App\Support\JobView;
use App\Support\Workshop;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Landing page (design/stitch overview): today per mechanic and what needs attention.
 */
class OverviewController extends Controller
{
    public function __invoke(Workshop $workshop): Response
    {
        $schedule = $workshop->schedule();
        $cal = $schedule->calendar;
        $availability = $workshop->availability();
        $next = $workshop->nextQuarter();
        $today = $workshop->today();

        $mechanics = Mechanic::query()->where('active', true)->ordered()->get();
        $ids = $mechanics->pluck('id')->all();
        $jobs = WorkOrder::query()->with(['customer', 'vehicle', 'mechanic'])->get()->keyBy('id');

        // Jobs that have at least one quarter today, with the part of the day they cover.
        $todayJobs = $jobs->map(function (WorkOrder $w) use ($schedule, $today, $cal) {
            $qs = collect($schedule->span($w->id))->filter(fn (Position $p) => $p->date === $today)->pluck('quarter');
            if ($qs->isEmpty()) {
                return null;
            }

            return ['job' => $w, 'from' => $cal->quarterStart($today, $qs->min()), 'to' => $cal->quarterEnd($today, $qs->max()), 'quarters' => $qs->count()];
        })->filter();

        $nextFree = $mechanics->filter(fn (Mechanic $m) => $m->worksOn('car'))
            ->map(fn (Mechanic $m) => ['mechanic' => $m->name, 'at' => $schedule->earliest($m->id, 4, $next)])
            ->filter(fn ($r) => $r['at'] !== null)
            ->sortBy(fn ($r) => $r['at']->key())
            ->first();

        $working = $mechanics->filter(fn (Mechanic $m) => $availability->isAvailable($m->id, $today));
        $warnings = $jobs->filter(fn (WorkOrder $w) => $schedule->warning($w->id) !== null);
        $toCall = $jobs->whereNotNull('notify_customer');
        $earlier = $schedule->earlierCandidates($next);

        return Inertia::render('overview', [
            'today' => [
                'date' => $today,
                'week' => (int) date('W', strtotime($today)),
                'open' => $cal->isOpen($today),
            ],
            'stats' => [
                'jobsToday' => [
                    'total' => $todayJobs->count(),
                    'inProgress' => $todayJobs->filter(fn ($t) => $t['job']->status === WorkOrderStatus::InProgress)->count(),
                    'scheduled' => $todayJobs->filter(fn ($t) => $t['job']->status === WorkOrderStatus::Scheduled)->count(),
                    'completed' => $todayJobs->filter(fn ($t) => $t['job']->status === WorkOrderStatus::Completed)->count(),
                    'waiting' => $todayJobs->filter(fn ($t) => $t['job']->status === WorkOrderStatus::WaitingParts)->count(),
                    'bookedPercent' => self::percent($schedule->utilisation($ids, $today, WorkCalendar::addDays($today, 1))),
                ],
                'mechanics' => [
                    'working' => $working->count(),
                    'total' => $mechanics->count(),
                    'off' => $mechanics->reject(fn (Mechanic $m) => $availability->isAvailable($m->id, $today))
                        ->map(fn (Mechanic $m) => ['name' => $m->name, 'reason' => $cal->isOpen($today) ? $availability->offReason($m->id, $today) : 'closed'])->values(),
                    'avatars' => $working->map(fn (Mechanic $m) => JobView::mechanic($m))->values(),
                ],
                'warnings' => [
                    'total' => $warnings->count(),
                    'first' => ($w = $warnings->first()) ? ['number' => $w->displayNumber(), 'vehicle' => $w->vehicle?->make_model, 'warning' => $schedule->warning($w->id)] : null,
                ],
                'toCall' => [
                    'total' => $toCall->count(),
                    'earlier' => $toCall->filter(fn (WorkOrder $w) => $w->notify_customer?->value === 'earlier')->count(),
                    'later' => $toCall->filter(fn (WorkOrder $w) => $w->notify_customer?->value === 'later')->count(),
                ],
                'nextFree' => $nextFree ? [
                    'date' => $nextFree['at']->date,
                    'time' => $cal->quarterStart($nextFree['at']->date, $nextFree['at']->quarter),
                    'mechanic' => $nextFree['mechanic'],
                ] : null,
            ],
            'lanes' => $mechanics->map(fn (Mechanic $m) => $this->lane($m, $today, $next, $todayJobs, $schedule, $availability))->values(),
            'attention' => $this->attention($warnings, $toCall, $earlier, $jobs, $schedule),
        ]);
    }

    /** One mechanic's day: jobs today in time order and the free stretches that can still be booked (from the next quarter). */
    private function lane(Mechanic $m, string $today, Position $from, Collection $todayJobs, Schedule $schedule, Availability $availability): array
    {
        $cal = $schedule->calendar;
        $quarters = $cal->quartersOn($today);
        $reason = ! $cal->isOpen($today) ? 'closed' : $availability->offReason($m->id, $today);
        $items = $todayJobs->filter(fn ($t) => $t['job']->mechanic_id === $m->id)
            ->sortBy(fn ($t) => $t['from'])
            ->map(fn ($t) => self::card($t['job'], $schedule) + ['from' => $t['from'], 'to' => $t['to'], 'todayQuarters' => $t['quarters']])
            ->values();

        $free = [];
        $booked = 0;
        if ($reason === null) {
            $run = null;
            for ($q = 0; $q < $quarters; $q++) {
                $p = new Position($today, $q);
                $isFree = $schedule->isFree($m->id, $p);
                $booked += $isFree ? 0 : 1;
                if ($isFree && ! $p->isBefore($from)) {
                    $run = $run ? [$run[0], $q] : [$q, $q];
                } elseif ($run) {
                    $free[] = $run;
                    $run = null;
                }
            }
            if ($run) {
                $free[] = $run;
            }
        }

        return JobView::mechanic($m) + [
            'off' => $reason === Availability::NOT_WORKING ? 'not_working' : $reason,
            'booked' => $booked,
            'available' => $reason === null ? $quarters : 0,
            'jobs' => $items,
            'free' => array_map(fn ($r) => [
                'from' => $cal->quarterStart($today, $r[0]),
                'to' => $cal->quarterEnd($today, $r[1]),
                'quarter' => $r[0],
                'quarters' => $r[1] - $r[0] + 1,
            ], $free),
        ];
    }

    /** @return list<array<string, mixed>> */
    private function attention(Collection $warnings, Collection $toCall, array $earlier, Collection $jobs, Schedule $schedule): array
    {
        $cal = $schedule->calendar;
        $items = [];
        foreach ($warnings as $w) {
            $items[] = ['kind' => 'warning', 'warning' => $schedule->warning($w->id)] + self::card($w, $schedule);
        }
        foreach ($toCall as $w) {
            $items[] = ['kind' => 'call'] + self::card($w, $schedule);
        }
        foreach ($earlier as $c) {
            $w = $jobs[$c['job']->id];
            $items[] = ['kind' => 'earlier', 'to' => ['date' => $c['to']->date, 'quarter' => $c['to']->quarter, 'time' => $cal->quarterStart($c['to']->date, $c['to']->quarter)]] + self::card($w, $schedule);
        }

        return $items;
    }

    /** @return array<string, mixed> */
    private static function card(WorkOrder $w, Schedule $schedule): array
    {
        $cal = $schedule->calendar;
        $start = $cal->normalize($w->startPosition());
        $end = $schedule->end($w->id) ?? $start;

        return [
            'id' => $w->id,
            'number' => $w->displayNumber(),
            'description' => $w->description,
            'status' => $w->status->value,
            'notify' => $w->notify_customer?->value,
            'warning' => $schedule->warning($w->id),
            'duration' => $w->duration_quarters,
            'planned' => $w->planned_quarters,
            'start' => ['date' => $start->date, 'quarter' => $start->quarter, 'time' => $cal->quarterStart($start->date, $start->quarter)],
            'end' => ['date' => $end->date, 'time' => $cal->quarterEnd($end->date, $end->quarter)],
            'customer' => ['name' => $w->customer?->name, 'phone' => $w->customer?->phone],
            'vehicle' => $w->vehicle ? ['make' => $w->vehicle->make_model, 'plate' => Vehicle::formatPlate($w->vehicle->plate), 'type' => $w->vehicle->type->value] : null,
            'mechanic' => $w->mechanic ? ['id' => $w->mechanic->id, 'name' => $w->mechanic->name] : null,
        ];
    }

    /** @param  array{available: int, booked: int}  $u */
    private static function percent(array $u): int
    {
        return $u['available'] > 0 ? (int) round($u['booked'] / $u['available'] * 100) : 0;
    }
}
