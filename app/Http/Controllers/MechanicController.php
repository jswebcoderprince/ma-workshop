<?php

namespace App\Http\Controllers;

use App\Enums\WorkOrderStatus;
use App\Http\Requests\MechanicRequest;
use App\Models\ActivityLog;
use App\Models\Closure;
use App\Models\Mechanic;
use App\Models\TimeOff;
use App\Scheduling\WorkCalendar;
use App\Support\JobView;
use App\Support\Workshop;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/** Mechanics, their time off, and the days the whole workshop is closed. */
class MechanicController extends Controller
{
    public function index(Workshop $workshop): Response
    {
        $schedule = $workshop->schedule();
        $today = $workshop->today();
        $monday = WorkCalendar::addDays($today, 1 - WorkCalendar::weekday($today));
        $now = $workshop->currentQuarter();
        $next = $workshop->nextQuarter();

        $mechanics = Mechanic::query()->ordered()
            ->withCount(['workOrders as open_jobs' => fn ($q) => $q->where('status', '!=', WorkOrderStatus::Completed->value)])
            ->withCount('workOrders')
            ->with(['timeOff' => fn ($q) => $q->where('ends_on', '>=', $today)->orderBy('starts_on')])
            ->get();

        return Inertia::render('mechanics/index', [
            'mechanics' => $mechanics->map(function (Mechanic $m) use ($schedule, $monday, $now, $next) {
                $u = $schedule->utilisation([$m->id], $monday, WorkCalendar::addDays($monday, 28), $now);
                $free = $m->active ? $schedule->earliest($m->id, 4, $next) : null;

                return JobView::mechanic($m) + [
                    'active' => $m->active,
                    'load' => $u['available'] ? (int) round($u['booked'] / $u['available'] * 100) : 0,
                    'nextFree' => $free?->date,
                    'openJobs' => $m->open_jobs,
                    'canDelete' => $m->work_orders_count === 0,
                    'timeOff' => $m->timeOff->map(fn (TimeOff $t) => [
                        'id' => $t->id,
                        'type' => $t->type->value,
                        'from' => $t->starts_on->format('Y-m-d'),
                        'to' => $t->ends_on->format('Y-m-d'),
                        'note' => $t->note,
                    ])->values(),
                ];
            })->values(),
            'closures' => Closure::query()->where('date', '>=', $today)->orderBy('date')->get()
                ->map(fn (Closure $c) => ['id' => $c->id, 'date' => $c->date->format('Y-m-d'), 'name' => $c->name])->values(),
            'palette' => JobView::PALETTE,
            'today' => $today,
        ]);
    }

    public function store(MechanicRequest $request): RedirectResponse
    {
        $order = (int) Mechanic::max('sort_order') + 1;
        $values = $request->values() + ['sort_order' => $order];
        $values['color'] ??= JobView::PALETTE[$order % count(JobView::PALETTE)];
        $mechanic = Mechanic::create($values);
        ActivityLog::record('mechanic.created', $mechanic, $values);

        return back()->with('status', 'saved');
    }

    public function update(MechanicRequest $request, Mechanic $mechanic): RedirectResponse
    {
        $before = $mechanic->only(['name', 'vehicle_types', 'work_days', 'color', 'active']);
        $mechanic->update($request->values());
        ActivityLog::record('mechanic.updated', $mechanic, ['before' => $before, 'after' => $mechanic->only(array_keys($before))]);

        return back()->with('status', 'saved');
    }

    public function destroy(Mechanic $mechanic): RedirectResponse
    {
        // Mechanics with job history are kept (set inactive instead), so old job cards and invoices stay correct.
        if ($mechanic->workOrders()->exists()) {
            return back()->withErrors(['mechanic' => __('This mechanic has jobs. Set them inactive instead of deleting.')]);
        }
        ActivityLog::record('mechanic.deleted', null, $mechanic->only(['id', 'name']));
        $mechanic->delete();

        return back()->with('status', 'saved');
    }
}
