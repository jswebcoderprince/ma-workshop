<?php

namespace App\Http\Controllers;

use App\Enums\NotifyDirection;
use App\Enums\WorkOrderStatus;
use App\Models\ActivityLog;
use App\Models\Mechanic;
use App\Models\WorkOrder;
use App\Scheduling\Position;
use App\Scheduling\Schedule;
use App\Support\Workshop;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/** Changes the owner makes to a job. Nothing here moves any other job (docs/SCHEDULING_RULES.md). */
class WorkOrderController extends Controller
{
    /** The owner called the customer about a moved booking. */
    public function informed(WorkOrder $workOrder): RedirectResponse
    {
        $was = $workOrder->notify_customer?->value;
        $workOrder->update(['notify_customer' => null]);
        ActivityLog::record('job.informed', $workOrder, ['was' => $was]);

        return back()->with('status', 'saved');
    }

    /** Move to another mechanic, day or quarter. A new date marks the customer "to call". */
    public function move(Request $request, WorkOrder $workOrder, Workshop $workshop): RedirectResponse
    {
        $v = $request->validate([
            'mechanic_id' => ['required', 'integer', 'exists:mechanics,id'],
            'date' => ['required', 'date_format:Y-m-d'],
            'quarter' => ['required', 'integer', 'min:0', 'max:3'],
        ]);
        $to = new Position($v['date'], (int) $v['quarter']);
        if (! $workshop->calendar()->isValid($to)) {
            return back()->withErrors(['date' => __('The workshop is closed at that time.')]);
        }

        $from = $workOrder->startPosition();
        $before = ['mechanic_id' => $workOrder->mechanic_id, 'date' => $from->date, 'quarter' => $from->quarter];
        $changes = ['mechanic_id' => (int) $v['mechanic_id'], 'start_date' => $to->date, 'start_quarter' => $to->quarter];
        if ($to->date !== $from->date && $workOrder->status === WorkOrderStatus::Scheduled) {
            $changes['notify_customer'] = $to->isBefore($from) ? NotifyDirection::Earlier : NotifyDirection::Later;
        }
        $workOrder->update($changes);
        ActivityLog::record('job.moved', $workOrder, ['before' => $before, 'after' => $v]);

        $flash = ['status' => 'saved'];
        $warning = (new Workshop)->schedule()->warning($workOrder->id);
        if ($warning !== null) {
            $flash['warning'] = $warning === Schedule::OVERLAP
                ? __('Moved, but it now overlaps another job of :name.', ['name' => Mechanic::find($v['mechanic_id'])?->name])
                : __('Moved, but :name is off during part of this job.', ['name' => Mechanic::find($v['mechanic_id'])?->name]);
        }

        return back()->with($flash);
    }
}
