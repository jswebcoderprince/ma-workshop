<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Mechanic;
use App\Models\TimeOff;
use App\Models\WorkOrder;
use App\Scheduling\ScheduledJob;
use App\Support\Workshop;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TimeOffController extends Controller
{
    public function store(Request $request, Mechanic $mechanic): RedirectResponse
    {
        $v = $request->validate([
            'type' => ['required', Rule::in(['holiday', 'day_off', 'sick'])],
            'starts_on' => ['required', 'date_format:Y-m-d'],
            'ends_on' => ['required', 'date_format:Y-m-d', 'after_or_equal:starts_on'],
            'note' => ['nullable', 'string', 'max:120'],
        ]);

        $overlaps = $mechanic->timeOff()
            ->where('starts_on', '<=', $v['ends_on'])
            ->where('ends_on', '>=', $v['starts_on'])
            ->exists();
        if ($overlaps) {
            return back()->withErrors(['starts_on' => __('This mechanic already has time off in these dates.')]);
        }

        $timeOff = $mechanic->timeOff()->create($v);
        ActivityLog::record('time_off.created', $timeOff, $v + ['mechanic' => $mechanic->name]);

        // Nothing is moved: jobs in that period stay where they are and get a warning on the calendar.
        $affected = $this->jobsDuring($mechanic->id, $v['starts_on'], $v['ends_on']);
        $flash = ['status' => 'saved'];
        if ($affected > 0) {
            $flash['warning'] = trans_choice(':count job falls in this time off. Check the calendar and move it if needed.|:count jobs fall in this time off. Check the calendar and move them if needed.', $affected, ['count' => $affected]);
        }

        return back()->with($flash);
    }

    public function destroy(TimeOff $timeOff): RedirectResponse
    {
        ActivityLog::record('time_off.deleted', null, $timeOff->only(['id', 'mechanic_id', 'type']) + [
            'from' => $timeOff->starts_on->format('Y-m-d'), 'to' => $timeOff->ends_on->format('Y-m-d'),
        ]);
        $timeOff->delete();

        return back()->with('status', 'saved');
    }

    private function jobsDuring(int $mechanicId, string $from, string $to): int
    {
        $schedule = (new Workshop)->schedule(); // fresh: includes the time off just saved

        return WorkOrder::query()->where('mechanic_id', $mechanicId)
            ->whereNotIn('status', [ScheduledJob::COMPLETED, ScheduledJob::WAITING_PARTS])
            ->get()
            ->filter(fn (WorkOrder $w) => collect($schedule->span($w->id))->contains(fn ($p) => $p->date >= $from && $p->date <= $to))
            ->count();
    }
}
