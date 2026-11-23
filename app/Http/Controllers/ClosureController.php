<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Closure;
use App\Models\WorkOrder;
use App\Support\Workshop;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/** Days the whole workshop is closed (public holidays and similar). */
class ClosureController extends Controller
{
    public function store(Request $request, Workshop $workshop): RedirectResponse
    {
        $v = $request->validate([
            'date' => ['required', 'date_format:Y-m-d', 'unique:closures,date'],
            'name' => ['required', 'string', 'max:80'],
        ]);

        // Jobs on that day continue on the next open day once it is closed; tell the owner how many.
        $schedule = $workshop->schedule();
        $affected = WorkOrder::query()->where('status', '!=', 'completed')->get()
            ->filter(fn (WorkOrder $w) => collect($schedule->span($w->id))->contains(fn ($p) => $p->date === $v['date']))
            ->count();

        $closure = Closure::create($v);
        ActivityLog::record('closure.created', $closure, $v);

        $flash = ['status' => 'saved'];
        if ($affected > 0) {
            $flash['warning'] = trans_choice(':count job was planned on this day. It now continues on the next open day.|:count jobs were planned on this day. They now continue on the next open day.', $affected, ['count' => $affected]);
        }

        return back()->with($flash);
    }

    public function destroy(Closure $closure): RedirectResponse
    {
        ActivityLog::record('closure.deleted', null, ['date' => $closure->date->format('Y-m-d'), 'name' => $closure->name]);
        $closure->delete();

        return back()->with('status', 'saved');
    }
}
