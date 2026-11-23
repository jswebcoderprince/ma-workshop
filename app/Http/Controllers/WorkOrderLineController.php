<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\WorkOrder;
use App\Models\WorkOrderLine;
use App\Support\Invoicing;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Labour and parts lines of a job. Locked while the job has an invoice that is not voided. */
class WorkOrderLineController extends Controller
{
    public function store(Request $request, WorkOrder $workOrder): RedirectResponse
    {
        if ($locked = $this->locked($workOrder)) {
            return $locked;
        }
        $v = $this->validated($request);
        $line = $workOrder->lines()->create($v + ['sort_order' => (int) $workOrder->lines()->max('sort_order') + 1]);
        ActivityLog::record('job.line_added', $workOrder, ['description' => $line->description]);

        return back()->with('status', 'saved');
    }

    public function update(Request $request, WorkOrderLine $workOrderLine): RedirectResponse
    {
        if ($locked = $this->locked($workOrderLine->workOrder)) {
            return $locked;
        }
        $workOrderLine->update($this->validated($request));

        return back()->with('status', 'saved');
    }

    public function destroy(WorkOrderLine $workOrderLine): RedirectResponse
    {
        $job = $workOrderLine->workOrder;
        if ($locked = $this->locked($job)) {
            return $locked;
        }
        $workOrderLine->delete();
        ActivityLog::record('job.line_removed', $job, ['description' => $workOrderLine->description]);

        return back()->with('status', 'saved');
    }

    /** @return array{kind: string, description: string, quantity: float, unit: string, unit_price_cents: int} */
    private function validated(Request $request): array
    {
        // Prices are typed in euros; "12,50" works as well as "12.50".
        $request->merge(['unit_price' => str_replace([',', ' '], ['.', ''], (string) $request->input('unit_price'))]);
        $request->merge(['quantity' => str_replace(',', '.', (string) $request->input('quantity'))]);
        $v = $request->validate([
            'kind' => ['required', Rule::in(['labour', 'part'])],
            'description' => ['required', 'string', 'max:255'],
            'quantity' => ['required', 'numeric', 'min:0.01', 'max:99999'],
            'unit' => ['required', Rule::in(Invoicing::UNITS)],
            'unit_price' => ['required', 'numeric', 'min:0', 'max:999999'],
        ]);

        return [
            'kind' => $v['kind'],
            'description' => $v['description'],
            'quantity' => round((float) $v['quantity'], 2),
            'unit' => $v['unit'],
            'unit_price_cents' => (int) round((float) $v['unit_price'] * 100),
        ];
    }

    private function locked(WorkOrder $job): ?RedirectResponse
    {
        return $job->invoices()->whereNull('voided_at')->exists()
            ? back()->withErrors(['lines' => __('The job has an invoice. Void it to change the lines.')])
            : null;
    }
}
