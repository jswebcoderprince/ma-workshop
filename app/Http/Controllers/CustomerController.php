<?php

namespace App\Http\Controllers;

use App\Enums\WorkOrderStatus;
use App\Http\Requests\CustomerRequest;
use App\Models\ActivityLog;
use App\Models\Customer;
use App\Models\Vehicle;
use App\Models\WorkOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    private const PER_PAGE = 25;

    public function index(Request $request): Response
    {
        $q = trim((string) $request->query('q', ''));
        $selectedId = $request->integer('customer') ?: null;

        $customers = Customer::query()->search($q)
            ->with('vehicles')
            ->withCount('workOrders')
            ->withMin(['workOrders as next_visit' => fn ($w) => $w->where('status', '!=', WorkOrderStatus::Completed->value)], 'start_date')
            ->orderBy('name')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return Inertia::render('customers/index', [
            'filters' => ['q' => $q],
            'customers' => [
                'data' => collect($customers->items())->map(fn (Customer $c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'phone' => $c->phone,
                    'email' => $c->email,
                    'vehicles' => $c->vehicles->map(fn (Vehicle $v) => self::vehicle($v))->values(),
                    'jobs' => $c->work_orders_count,
                    'nextVisit' => $c->next_visit ? substr((string) $c->next_visit, 0, 10) : null,
                ])->values(),
                'total' => $customers->total(),
                'from' => $customers->firstItem(),
                'to' => $customers->lastItem(),
                'prev' => $customers->previousPageUrl(),
                'next' => $customers->nextPageUrl(),
            ],
            // The customer sheet. Loaded on a full visit with ?customer=ID, or on its own with a partial reload.
            'selected' => fn () => $selectedId ? $this->detail(Customer::find($selectedId)) : null,
        ]);
    }

    /** Small JSON search used by the job form's customer picker. */
    public function search(Request $request): JsonResponse
    {
        $results = Customer::query()->search((string) $request->query('q', ''))
            ->with('vehicles')->orderBy('name')->limit(8)->get()
            ->map(fn (Customer $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'phone' => $c->phone,
                'vehicles' => $c->vehicles->map(fn (Vehicle $v) => self::vehicle($v))->values(),
            ]);

        return response()->json($results);
    }

    public function store(CustomerRequest $request): RedirectResponse
    {
        $customer = DB::transaction(function () use ($request) {
            $customer = Customer::create($request->customer());
            if ($vehicle = $request->vehicle()) {
                $customer->vehicles()->create($vehicle);
            }

            return $customer;
        });
        ActivityLog::record('customer.created', $customer, $request->validated());

        return redirect()->route('customers', ['customer' => $customer->id])->with('status', 'saved');
    }

    public function update(CustomerRequest $request, Customer $customer): RedirectResponse
    {
        $customer->update($request->customer());
        ActivityLog::record('customer.updated', $customer, $customer->getChanges());

        return back()->with('status', 'saved');
    }

    public function destroy(Customer $customer): RedirectResponse
    {
        if ($customer->workOrders()->exists()) {
            return back()->withErrors(['customer' => __('This customer has jobs and cannot be deleted.')]);
        }
        ActivityLog::record('customer.deleted', null, $customer->only(['id', 'name', 'phone']));
        $customer->delete();

        return redirect()->route('customers')->with('status', 'saved');
    }

    /** @return array<string, mixed>|null */
    private function detail(?Customer $c): ?array
    {
        if ($c === null) {
            return null;
        }
        $c->load(['vehicles', 'workOrders' => fn ($q) => $q->with('mechanic', 'vehicle')->orderByDesc('start_date')->orderByDesc('id')->limit(30)]);

        return [
            'id' => $c->id,
            'name' => $c->name,
            'phone' => $c->phone,
            'email' => $c->email,
            'company_code' => $c->company_code,
            'vat_code' => $c->vat_code,
            'address' => $c->address,
            'notes' => $c->notes,
            'vehicles' => $c->vehicles->map(fn (Vehicle $v) => self::vehicle($v) + [
                'canDelete' => ! $c->workOrders->contains('vehicle_id', $v->id),
            ])->values(),
            'jobs' => $c->workOrders->map(fn (WorkOrder $w) => [
                'id' => $w->id,
                'number' => $w->displayNumber(),
                'description' => $w->description,
                'status' => $w->status->value,
                'date' => $w->start_date->format('Y-m-d'),
                'mechanic' => $w->mechanic?->name,
                'vehicle' => $w->vehicle?->make_model,
            ])->values(),
            'canDelete' => $c->workOrders->isEmpty(),
        ];
    }

    /** @return array<string, mixed> */
    public static function vehicle(Vehicle $v): array
    {
        return [
            'id' => $v->id,
            'type' => $v->type->value,
            'make' => $v->make_model,
            'year' => $v->year,
            'plate' => Vehicle::formatPlate($v->plate),
            'vin' => $v->vin,
        ];
    }
}
