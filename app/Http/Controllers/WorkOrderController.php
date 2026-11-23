<?php

namespace App\Http\Controllers;

use App\Enums\NotifyDirection;
use App\Enums\WorkOrderStatus;
use App\Models\ActivityLog;
use App\Models\Customer;
use App\Models\Mechanic;
use App\Models\Vehicle;
use App\Models\WorkOrder;
use App\Scheduling\Position;
use App\Scheduling\Schedule;
use App\Support\Workshop;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/** Changes the owner makes to a job. Nothing here moves any other job (docs/SCHEDULING_RULES.md). */
class WorkOrderController extends Controller
{
    private const MAX_QUARTERS = 40;

    /** Book a job, for an existing or a new customer and vehicle. */
    public function store(Request $request, Workshop $workshop): RedirectResponse
    {
        $v = $request->validate([
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'customer.name' => ['required_without:customer_id', 'nullable', 'string', 'max:120'],
            'customer.phone' => ['nullable', 'string', 'max:40', 'regex:/^[0-9+()\s-]+$/'],
            'vehicle_id' => ['nullable', 'integer', 'exists:vehicles,id'],
            'vehicle.type' => ['required_without:vehicle_id', 'nullable', Rule::in(['car', 'moto', 'water'])],
            'vehicle.make_model' => ['required_without:vehicle_id', 'nullable', 'string', 'max:80'],
            'vehicle.year' => ['nullable', 'integer', 'between:1900,'.(date('Y') + 1)],
            'vehicle.plate' => ['nullable', 'string', 'max:15'],
            'vehicle.vin' => ['nullable', 'string', 'max:17', 'alpha_num'],
            'mechanic_id' => ['required', 'integer', Rule::exists('mechanics', 'id')->where('active', true)],
            'description' => ['required', 'string', 'max:2000'],
            'date' => ['required', 'date_format:Y-m-d'],
            'quarter' => ['required', 'integer', 'min:0', 'max:3'],
            'duration' => ['required', 'integer', 'min:1', 'max:'.self::MAX_QUARTERS],
            'mileage' => ['nullable', 'integer', 'min:0', 'max:9999999'],
            'view' => ['nullable', Rule::in(['day', 'week', 'month'])],
        ]);

        if (! $workshop->calendar()->isValid(new Position($v['date'], (int) $v['quarter']))) {
            return back()->withErrors(['date' => __('The workshop is closed at that time.')]);
        }
        if (! empty($v['vehicle_id']) && Vehicle::whereKey($v['vehicle_id'])->value('customer_id') !== (int) ($v['customer_id'] ?? 0)) {
            return back()->withErrors(['vehicle_id' => __('This vehicle belongs to another customer.')]);
        }

        $job = DB::transaction(function () use ($v) {
            $customer = ! empty($v['customer_id'])
                ? Customer::findOrFail($v['customer_id'])
                : Customer::create(['name' => $v['customer']['name'], 'phone' => $v['customer']['phone'] ?? null]);
            $vehicleId = $v['vehicle_id'] ?? $customer->vehicles()->create($v['vehicle'])->id;

            return WorkOrder::create([
                'customer_id' => $customer->id,
                'vehicle_id' => $vehicleId,
                'mechanic_id' => $v['mechanic_id'],
                'description' => $v['description'],
                'start_date' => $v['date'],
                'start_quarter' => $v['quarter'],
                'duration_quarters' => $v['duration'],
                'mileage' => $v['mileage'] ?? null,
            ]);
        });
        ActivityLog::record('job.created', $job, ['date' => $v['date'], 'quarter' => $v['quarter'], 'duration' => $v['duration'], 'mechanic_id' => $v['mechanic_id']]);

        return redirect()
            ->route('calendar', ['view' => $v['view'] ?? 'week', 'date' => $v['date'], 'job' => $job->id])
            ->with($this->flash($job));
    }

    /** Work description, mileage, or a different vehicle of the same customer. */
    public function update(Request $request, WorkOrder $workOrder): RedirectResponse
    {
        $v = $request->validate([
            'description' => ['required', 'string', 'max:2000'],
            'mileage' => ['nullable', 'integer', 'min:0', 'max:9999999'],
            'vehicle_id' => ['nullable', 'integer', Rule::exists('vehicles', 'id')->where('customer_id', $workOrder->customer_id)],
        ]);
        $workOrder->update($v);
        ActivityLog::record('job.updated', $workOrder, $workOrder->getChanges());

        return back()->with('status', 'saved');
    }

    /** Longer or shorter, in quarters: either a change (+2) or an exact length. Later jobs are not moved. */
    public function duration(Request $request, WorkOrder $workOrder): RedirectResponse
    {
        $v = $request->validate([
            'delta' => ['required_without:quarters', 'nullable', 'integer', 'between:-40,40'],
            'quarters' => ['required_without:delta', 'nullable', 'integer', 'min:1', 'max:'.self::MAX_QUARTERS],
        ]);
        $before = $workOrder->duration_quarters;
        $after = $v['quarters'] ?? max(1, min(self::MAX_QUARTERS, $before + (int) $v['delta']));
        $workOrder->update(['duration_quarters' => $after]);
        ActivityLog::record('job.duration', $workOrder, ['before' => $before, 'after' => $after]);

        return back()->with($this->flash($workOrder));
    }

    /**
     * Scheduled, in progress, waiting for parts, completed. "Completed now" also cuts the job at the end
     * of the current quarter, which is what frees the time for "could start earlier".
     */
    public function status(Request $request, WorkOrder $workOrder, Workshop $workshop): RedirectResponse
    {
        $v = $request->validate([
            'status' => ['required', Rule::in(array_column(WorkOrderStatus::cases(), 'value'))],
            'finish_now' => ['sometimes', 'boolean'],
        ]);
        $before = ['status' => $workOrder->status->value, 'duration' => $workOrder->duration_quarters];
        $changes = ['status' => $v['status'], 'completed_at' => $v['status'] === 'completed' ? Date::now() : null];

        if ($v['status'] === 'completed' && ($v['finish_now'] ?? false)) {
            $cal = $workshop->calendar();
            $start = $cal->normalize($workOrder->startPosition());
            $now = $workshop->currentQuarter();
            $span = $cal->span($start, $workOrder->duration_quarters);
            if (collect($span)->contains(fn (Position $p) => $p->equals($now))) {
                $changes['duration_quarters'] = $cal->distance($start, $now) + 1;
            }
        }
        $workOrder->update($changes);
        ActivityLog::record('job.status', $workOrder, ['before' => $before, 'after' => ['status' => $v['status'], 'duration' => $workOrder->duration_quarters]]);

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

        return back()->with($this->flash($workOrder));
    }

    /** The owner called the customer about a moved booking. */
    public function informed(WorkOrder $workOrder): RedirectResponse
    {
        $was = $workOrder->notify_customer?->value;
        $workOrder->update(['notify_customer' => null]);
        ActivityLog::record('job.informed', $workOrder, ['was' => $was]);

        return back()->with('status', 'saved');
    }

    public function destroy(WorkOrder $workOrder): RedirectResponse
    {
        if ($workOrder->invoice()->exists()) {
            return back()->withErrors(['job' => __('This job has an invoice and cannot be deleted.')]);
        }
        ActivityLog::record('job.deleted', null, $workOrder->only(['id', 'number', 'customer_id', 'mechanic_id', 'description']) + [
            'date' => $workOrder->start_date->format('Y-m-d'),
        ]);
        $workOrder->delete();

        return redirect()->route('calendar', request()->only(['view', 'date', 'mechanic']))->with('status', 'saved');
    }

    /** "Saved", plus a warning when the job now overlaps another job or falls on the mechanic's day off. */
    private function flash(WorkOrder $job): array
    {
        $warning = (new Workshop)->schedule()->warning($job->id);
        if ($warning === null) {
            return ['status' => 'saved'];
        }
        $name = Mechanic::find($job->mechanic_id)?->name;

        return ['status' => 'saved', 'warning' => $warning === Schedule::OVERLAP
            ? __('Saved, but it overlaps another job of :name.', ['name' => $name])
            : __('Saved, but :name is off during part of this job.', ['name' => $name])];
    }
}
