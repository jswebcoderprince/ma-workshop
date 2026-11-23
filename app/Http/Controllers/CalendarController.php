<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Mechanic;
use App\Models\Vehicle;
use App\Models\WorkOrder;
use App\Scheduling\Availability;
use App\Scheduling\Position;
use App\Scheduling\Schedule;
use App\Scheduling\WorkCalendar;
use App\Support\JobView;
use App\Support\Workshop;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The schedule board (design/stitch/schedule_desktop_precision_planner_pro): mechanics as lanes,
 * quarter-day columns, a job inspector, and the "when can we take it?" search.
 */
class CalendarController extends Controller
{
    private const DAYS = ['day' => 1, 'week' => 7, 'month' => 35];

    public function index(Request $request, Workshop $workshop): Response
    {
        $view = in_array($request->query('view'), ['day', 'week', 'month'], true) ? $request->query('view') : 'week';
        $today = $workshop->today();
        $anchor = self::date($request->query('date')) ?? $today;
        // Week and month start on the Monday of the anchor's week; the day view shows the anchor itself.
        $from = $view === 'day' ? $anchor : WorkCalendar::addDays($anchor, 1 - WorkCalendar::weekday($anchor));
        $to = WorkCalendar::addDays($from, self::DAYS[$view]); // exclusive

        $schedule = $workshop->schedule();
        $cal = $schedule->calendar;
        $availability = $workshop->availability();
        $next = $workshop->nextQuarter();

        $all = Mechanic::query()->where('active', true)->ordered()->get();
        $filter = $request->integer('mechanic') ?: null;
        $mechanics = $filter ? $all->where('id', $filter)->values() : $all;
        $ids = $mechanics->pluck('id')->all();

        $days = [];
        for ($d = $from; $d < $to; $d = WorkCalendar::addDays($d, 1)) {
            $quarters = $cal->quartersOn($d);
            $times = [];
            for ($q = 0; $q < $quarters; $q++) {
                $times[] = $cal->quarterStart($d, $q);
            }
            $days[] = [
                'date' => $d,
                'weekday' => WorkCalendar::weekday($d),
                'week' => (int) date('W', strtotime($d)),
                'quarters' => $quarters,
                'times' => $times,
                'close' => $quarters ? $cal->quarterEnd($d, $quarters - 1) : null,
                'closure' => $cal->closureName($d),
                'free' => $schedule->freeQuarters($ids, $d, $next),
            ];
        }

        $jobs = WorkOrder::query()->with(['customer', 'vehicle', 'mechanic'])
            ->whereIn('mechanic_id', $ids)
            ->where('start_date', '<', $to)
            ->get()
            ->map(function (WorkOrder $w) use ($schedule, $from, $to) {
                $span = collect($schedule->span($w->id));
                $cells = $span->filter(fn (Position $p) => $p->date >= $from && $p->date < $to)
                    ->map(fn (Position $p) => [$p->date, $p->quarter])->values();

                // skip: quarters of the job before this view (needed to drag a job that started earlier).
                return $cells->isEmpty() ? null : JobView::row($w, $schedule) + [
                    'cells' => $cells,
                    'skip' => $span->filter(fn (Position $p) => $p->date < $from)->count(),
                ];
            })->filter()->values();

        $usage = $schedule->utilisation($ids, $from, $to, $workshop->currentQuarter());

        return Inertia::render('calendar/index', [
            'view' => $view,
            'anchor' => $anchor,
            'today' => $today,
            'from' => $from,
            'days' => $days,
            'mechanics' => $mechanics->map(fn (Mechanic $m) => $this->lane($m, $days, $schedule, $availability))->values(),
            'jobs' => $jobs,
            'summary' => [
                'booked' => $usage['booked'],
                'available' => $usage['available'],
                'free' => array_sum(array_column($days, 'free')),
                'toCall' => $jobs->whereNotNull('notify')->count(),
                'warnings' => $jobs->whereNotNull('warning')->count(),
            ],
            'filters' => ['mechanic' => $filter],
            'options' => $all->map(fn (Mechanic $m) => JobView::mechanic($m))->values(),
            'next' => ['date' => $next->date, 'quarter' => $next->quarter],
            // Opening time and quarters per ISO weekday, so forms can show quarter times for any date.
            'hours' => Workshop::hours(),
            'selected' => fn () => ($id = $request->integer('job')) ? $this->detail(WorkOrder::find($id), $schedule, $next) : null,
        ]);
    }

    /** "When can we take it?" Earliest start per mechanic who works on that vehicle type. */
    public function slots(Request $request, Workshop $workshop): JsonResponse
    {
        $v = $request->validate([
            'duration' => ['required', 'integer', 'min:1', 'max:40'],
            'type' => ['nullable', Rule::in(['car', 'moto', 'water'])],
        ]);
        $schedule = $workshop->schedule();
        $cal = $schedule->calendar;
        $next = $workshop->nextQuarter();

        $rows = Mechanic::query()->where('active', true)->ordered()->get()
            ->filter(fn (Mechanic $m) => empty($v['type']) || $m->worksOn($v['type']))
            ->map(function (Mechanic $m) use ($schedule, $cal, $next, $v) {
                $start = $schedule->earliest($m->id, (int) $v['duration'], $next);
                $end = $start ? $cal->end($start, (int) $v['duration']) : null;

                return [
                    'mechanic' => JobView::mechanic($m),
                    'start' => $start ? ['date' => $start->date, 'quarter' => $start->quarter, 'time' => $cal->quarterStart($start->date, $start->quarter)] : null,
                    'end' => $end ? ['date' => $end->date, 'time' => $cal->quarterEnd($end->date, $end->quarter)] : null,
                ];
            })
            ->sortBy(fn ($r) => $r['start'] ? $r['start']['date'].'#'.$r['start']['quarter'] : 'z')
            ->values();

        return response()->json($rows);
    }

    /** Live preview for the job form: where a booking would end and whether it clashes. */
    public function check(Request $request, Workshop $workshop): JsonResponse
    {
        $v = $request->validate([
            'mechanic_id' => ['required', 'integer', 'exists:mechanics,id'],
            'date' => ['required', 'date_format:Y-m-d'],
            'quarter' => ['required', 'integer', 'min:0', 'max:3'],
            'duration' => ['required', 'integer', 'min:1', 'max:40'],
            'ignore' => ['nullable', 'integer'],
        ]);
        $schedule = $workshop->schedule();
        $cal = $schedule->calendar;
        $start = new Position($v['date'], (int) $v['quarter']);
        if (! $cal->isValid($start)) {
            return response()->json(['valid' => false, 'end' => null, 'warning' => null]);
        }
        $end = $cal->end($start, (int) $v['duration']);

        return response()->json([
            'valid' => true,
            'end' => ['date' => $end->date, 'time' => $cal->quarterEnd($end->date, $end->quarter)],
            'warning' => $schedule->check((int) $v['mechanic_id'], $start, (int) $v['duration'], $v['ignore'] ?? null),
        ]);
    }

    /** @param  list<array<string, mixed>>  $days */
    private function lane(Mechanic $m, array $days, Schedule $schedule, Availability $availability): array
    {
        $off = [];
        foreach ($days as $d) {
            if ($d['quarters'] > 0 && ($reason = $availability->offReason($m->id, $d['date'])) !== null) {
                $off[$d['date']] = $reason;
            }
        }
        $from = $days[0]['date'];
        $to = WorkCalendar::addDays($days[count($days) - 1]['date'], 1);
        $u = $schedule->utilisation([$m->id], $from, $to);

        return JobView::mechanic($m) + ['off' => (object) $off, 'booked' => $u['booked'], 'available' => $u['available']];
    }

    /** @return array<string, mixed>|null */
    private function detail(?WorkOrder $w, Schedule $schedule, Position $next): ?array
    {
        if ($w === null) {
            return null;
        }
        $w->load(['customer', 'vehicle', 'mechanic']);
        $cal = $schedule->calendar;
        $suggest = null;
        if ($w->status->value === 'scheduled') {
            $at = $schedule->earliest($w->mechanic_id, $w->duration_quarters, $next, $w->id);
            if ($at && $at->date < $w->start_date->format('Y-m-d')) {
                $suggest = ['date' => $at->date, 'quarter' => $at->quarter, 'time' => $cal->quarterStart($at->date, $at->quarter)];
            }
        }

        return JobView::row($w, $schedule) + [
            'mileage' => $w->mileage,
            'customer' => ['id' => $w->customer_id, 'name' => $w->customer?->name, 'phone' => $w->customer?->phone, 'email' => $w->customer?->email],
            'vehicle' => $w->vehicle ? [
                'id' => $w->vehicle->id,
                'type' => $w->vehicle->type->value,
                'make' => $w->vehicle->make_model,
                'year' => $w->vehicle->year,
                'plate' => Vehicle::formatPlate($w->vehicle->plate),
                'vin' => $w->vehicle->vin,
            ] : null,
            'earlier' => $suggest,
            'log' => ActivityLog::query()
                ->where('subject_type', $w->getMorphClass())->where('subject_id', $w->id)
                ->latest('id')->limit(15)->get()
                ->map(fn (ActivityLog $l) => [
                    'action' => $l->action,
                    'at' => $l->created_at?->setTimezone(config('workshop.timezone'))->format('Y-m-d H:i'),
                    'changes' => $l->changes,
                ])->values(),
        ];
    }

    private static function date(mixed $value): ?string
    {
        return is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) && strtotime($value) ? $value : null;
    }
}
