<?php

namespace App\Http\Controllers;

use App\Enums\WorkOrderStatus;
use App\Models\ActivityLog;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Mechanic;
use App\Models\Vehicle;
use App\Models\WorkOrder;
use App\Models\WorkOrderLine;
use App\Scheduling\Schedule;
use App\Support\Invoicing;
use App\Support\JobView;
use App\Support\Settings;
use App\Support\Workshop;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** The jobs list, one job's page (work and parts lines, invoice) and its printable job card. */
class JobController extends Controller
{
    private const PER_PAGE = 25;

    private const STATUSES = ['open', 'scheduled', 'in_progress', 'waiting_parts', 'completed', 'all'];

    public function index(Request $request, Workshop $workshop): Response
    {
        $q = trim((string) $request->query('q', ''));
        $status = in_array($request->query('status'), self::STATUSES, true) ? $request->query('status') : 'open';
        $flag = in_array($request->query('flag'), ['call', 'warning'], true) ? $request->query('flag') : null;
        $mechanic = $request->integer('mechanic') ?: null;
        $schedule = $workshop->schedule();

        $query = WorkOrder::query()->with(['customer', 'vehicle', 'mechanic', 'invoice']);
        $this->search($query, $q);
        if ($mechanic) {
            $query->where('mechanic_id', $mechanic);
        }
        match ($status) {
            'open' => $query->where('status', '!=', WorkOrderStatus::Completed->value),
            'all' => null,
            default => $query->where('status', $status),
        };
        if ($flag === 'call') {
            $query->whereNotNull('notify_customer');
        } elseif ($flag === 'warning') {
            $query->whereIn('id', $this->warningIds($schedule));
        }
        // Open work reads top-down by date; finished and mixed lists start with the newest.
        $newestFirst = in_array($status, ['completed', 'all'], true);
        $query->orderBy('start_date', $newestFirst ? 'desc' : 'asc')
            ->orderBy('start_quarter', $newestFirst ? 'desc' : 'asc')
            ->orderBy('number', $newestFirst ? 'desc' : 'asc');

        $page = $query->paginate(self::PER_PAGE)->withQueryString();
        $counts = WorkOrder::query()->selectRaw('status, count(*) as n')->groupBy('status')->pluck('n', 'status');

        return Inertia::render('jobs/index', [
            'filters' => ['q' => $q, 'status' => $status, 'flag' => $flag, 'mechanic' => $mechanic],
            'jobs' => [
                'data' => collect($page->items())->map(fn (WorkOrder $w) => JobView::row($w, $schedule) + [
                    'invoice' => $w->invoice ? ['id' => $w->invoice->id, 'number' => $w->invoice->displayNumber()] : null,
                ])->values(),
                'total' => $page->total(),
                'from' => $page->firstItem(),
                'to' => $page->lastItem(),
                'prev' => $page->previousPageUrl(),
                'next' => $page->nextPageUrl(),
            ],
            'counts' => [
                'open' => (int) $counts->except(WorkOrderStatus::Completed->value)->sum(),
                'scheduled' => (int) ($counts[WorkOrderStatus::Scheduled->value] ?? 0),
                'in_progress' => (int) ($counts[WorkOrderStatus::InProgress->value] ?? 0),
                'waiting_parts' => (int) ($counts[WorkOrderStatus::WaitingParts->value] ?? 0),
                'completed' => (int) ($counts[WorkOrderStatus::Completed->value] ?? 0),
                'all' => (int) $counts->sum(),
                'call' => WorkOrder::query()->whereNotNull('notify_customer')->count(),
                'warning' => count($this->warningIds($schedule)),
            ],
            'mechanics' => Mechanic::query()->ordered()->get()->map(fn (Mechanic $m) => JobView::mechanic($m))->values(),
        ]);
    }

    public function show(WorkOrder $workOrder, Workshop $workshop): Response
    {
        $w = $workOrder->load(['customer', 'vehicle', 'mechanic', 'lines', 'invoices']);
        $schedule = $workshop->schedule();
        $vatPayer = (bool) Settings::get('vat_payer');
        $vatRate = (float) Settings::get('vat_rate');
        $current = $w->invoices->firstWhere('voided_at', null);

        return Inertia::render('jobs/show', [
            'job' => JobView::row($w, $schedule) + [
                'mileage' => $w->mileage,
                'customer' => self::customer($w->customer),
                'vehicle' => $w->vehicle ? self::vehicle($w->vehicle) : null,
                'log' => ActivityLog::query()
                    ->where('subject_type', $w->getMorphClass())->where('subject_id', $w->id)
                    ->latest('id')->limit(20)->get()
                    ->map(fn (ActivityLog $l) => [
                        'action' => $l->action,
                        'at' => $l->created_at?->setTimezone(config('workshop.timezone'))->format('Y-m-d H:i'),
                        'changes' => $l->changes,
                    ])->values(),
            ],
            'lines' => $w->lines->map(fn (WorkOrderLine $l) => self::line($l))->values(),
            'totals' => Invoicing::totals($w->lines, $vatPayer, $vatRate),
            'invoice' => $current ? self::invoiceSummary($current) : null,
            'voided' => $w->invoices->whereNotNull('voided_at')->map(fn (Invoice $i) => self::invoiceSummary($i))->values(),
            'billing' => [
                'vatPayer' => $vatPayer,
                'vatRate' => $vatRate,
                'hourlyRate' => (int) Settings::get('hourly_rate_cents'),
                'paymentDays' => (int) Settings::get('payment_days'),
                'nextNumber' => $this->nextInvoiceNumber(),
                'today' => $workshop->today(),
                'units' => Invoicing::UNITS,
            ],
        ]);
    }

    /** A4 job card for the mechanic: printed from the browser, no prices. */
    public function card(WorkOrder $workOrder, Workshop $workshop): Response
    {
        $w = $workOrder->load(['customer', 'vehicle', 'mechanic', 'lines']);

        return Inertia::render('print/job-card', [
            'job' => JobView::row($w, $workshop->schedule()) + [
                'mileage' => $w->mileage,
                'customer' => self::customer($w->customer),
                'vehicle' => $w->vehicle ? self::vehicle($w->vehicle) : null,
            ],
            'lines' => $w->lines->map(fn (WorkOrderLine $l) => self::line($l))->values(),
            'company' => Settings::get('company'),
            'printedOn' => $workshop->today(),
        ]);
    }

    /** Number, customer name, phone, plate, make or words from the work description. */
    private function search(Builder $query, string $q): void
    {
        if ($q === '') {
            return;
        }
        $number = preg_match('/^#?\s*(\d{1,7})$/', $q, $m) ? (int) $m[1] : null;
        $query->where(function (Builder $w) use ($q, $number) {
            $w->where('description', 'like', '%'.$q.'%')
                ->orWhereHas('customer', fn (Builder $c) => $c->search($q))
                ->orWhereHas('vehicle', fn (Builder $v) => $v
                    ->where('plate', 'like', '%'.Vehicle::normalizePlate($q).'%')
                    ->orWhere('make_model', 'like', '%'.$q.'%'));
            if ($number !== null) {
                $w->orWhere('number', $number);
            }
        });
    }

    /** @return list<int> open jobs that overlap another job or fall on the mechanic's time off */
    private function warningIds(Schedule $schedule): array
    {
        return WorkOrder::query()->where('status', '!=', WorkOrderStatus::Completed->value)->pluck('id')
            ->filter(fn (int $id) => $schedule->warning($id) !== null)->values()->all();
    }

    private function nextInvoiceNumber(): string
    {
        $series = (string) Settings::get('invoice_series');
        $used = (int) Invoice::query()->where('series', $series)->max('number');

        return $series.'-'.str_pad((string) max((int) Settings::get('invoice_next_number'), $used + 1), 4, '0', STR_PAD_LEFT);
    }

    /** @return array<string, mixed> */
    public static function line(WorkOrderLine $l): array
    {
        return [
            'id' => $l->id,
            'kind' => $l->kind->value,
            'description' => $l->description,
            'quantity' => (float) $l->quantity,
            'unit' => $l->unit,
            'unitPrice' => $l->unit_price_cents,
            'total' => Invoicing::lineTotal($l->quantity, $l->unit_price_cents),
        ];
    }

    /** @return array<string, mixed> */
    public static function invoiceSummary(Invoice $i): array
    {
        return [
            'id' => $i->id,
            'number' => $i->displayNumber(),
            'issuedOn' => $i->issued_on->format('Y-m-d'),
            'dueOn' => $i->due_on->format('Y-m-d'),
            'total' => $i->total_cents,
            'voidedAt' => $i->voided_at?->setTimezone(config('workshop.timezone'))->format('Y-m-d H:i'),
        ];
    }

    /** @return array<string, mixed>|null */
    private static function customer(?Customer $c): ?array
    {
        return $c ? $c->only(['id', 'name', 'phone', 'email', 'company_code', 'vat_code', 'address']) : null;
    }

    /** @return array<string, mixed> */
    private static function vehicle(Vehicle $v): array
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
