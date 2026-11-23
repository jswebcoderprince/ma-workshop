<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Invoice;
use App\Models\InvoiceLine;
use App\Models\WorkOrder;
use App\Support\Invoicing;
use App\Support\Settings;
use App\Support\Workshop;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Inertia\Inertia;
use Inertia\Response;

/** Simple invoices (docs/SCOPE.md): issue from a job, print or save as PDF, void. No payments or credit notes. */
class InvoiceController extends Controller
{
    private const PER_PAGE = 25;

    public function index(Request $request, Workshop $workshop): Response
    {
        $q = trim((string) $request->query('q', ''));
        $status = in_array($request->query('status'), ['issued', 'voided'], true) ? $request->query('status') : 'all';

        $query = Invoice::query()->with('workOrder.vehicle');
        if ($q !== '') {
            $number = preg_match('/(\d{1,7})$/', $q, $m) ? (int) $m[1] : null;
            $query->where(function (Builder $w) use ($q, $number) {
                // The buyer is a frozen copy, but also match today's customer record (phone, plate).
                $w->whereRaw("LOWER(JSON_UNQUOTE(JSON_EXTRACT(buyer, '$.name'))) LIKE ?", ['%'.mb_strtolower($q).'%'])
                    ->orWhereHas('workOrder.customer', fn (Builder $c) => $c->search($q));
                if ($number !== null) {
                    $w->orWhere('number', $number);
                }
            });
        }
        if ($status === 'issued') {
            $query->whereNull('voided_at');
        } elseif ($status === 'voided') {
            $query->whereNotNull('voided_at');
        }
        $page = $query->orderByDesc('issued_on')->orderByDesc('number')->paginate(self::PER_PAGE)->withQueryString();

        // This month and last month, valid invoices only.
        $today = $workshop->today();
        $month = substr($today, 0, 7);
        $lastMonth = date('Y-m', strtotime($month.'-01 -1 month'));
        $sum = fn (string $ym) => Invoice::query()->whereNull('voided_at')
            ->whereBetween('issued_on', [$ym.'-01', date('Y-m-t', strtotime($ym.'-01'))]);

        return Inertia::render('invoices/index', [
            'filters' => ['q' => $q, 'status' => $status],
            'invoices' => [
                'data' => collect($page->items())->map(fn (Invoice $i) => JobController::invoiceSummary($i) + [
                    'customer' => $i->buyer['name'] ?? '',
                    'job' => $i->workOrder ? ['id' => $i->workOrder->id, 'number' => $i->workOrder->displayNumber(), 'vehicle' => $i->workOrder->vehicle?->make_model] : null,
                    'subtotal' => $i->subtotal_cents,
                    'vat' => $i->vat_cents,
                ])->values(),
                'total' => $page->total(),
                'from' => $page->firstItem(),
                'to' => $page->lastItem(),
                'prev' => $page->previousPageUrl(),
                'next' => $page->nextPageUrl(),
            ],
            'summary' => [
                'month' => $month,
                'monthCount' => $sum($month)->count(),
                'monthTotal' => (int) $sum($month)->sum('total_cents'),
                'lastMonth' => $lastMonth,
                'lastMonthTotal' => (int) $sum($lastMonth)->sum('total_cents'),
                'voided' => Invoice::query()->whereNotNull('voided_at')->count(),
            ],
        ]);
    }

    public function store(Request $request, WorkOrder $workOrder): RedirectResponse
    {
        $v = $request->validate([
            'issued_on' => ['required', 'date_format:Y-m-d'],
            'due_on' => ['required', 'date_format:Y-m-d', 'after_or_equal:issued_on'],
        ]);
        if (! $workOrder->lines()->exists()) {
            return back()->withErrors(['invoice' => __('Add at least one line before issuing the invoice.')]);
        }
        if (trim((string) (Settings::get('company')['name'] ?? '')) === '') {
            return back()->withErrors(['invoice' => __('Fill in the company details in Settings first.')]);
        }
        $invoice = Invoicing::issue($workOrder, $v['issued_on'], $v['due_on']);
        if ($invoice === null) {
            return back()->withErrors(['invoice' => __('This job already has an invoice.')]);
        }

        return back()->with('status', 'saved');
    }

    /** Printable A4 invoice. */
    public function show(Invoice $invoice): Response
    {
        $invoice->load(['lines', 'workOrder.vehicle']);

        return Inertia::render('print/invoice', [
            'invoice' => JobController::invoiceSummary($invoice) + [
                'seller' => $invoice->seller,
                'buyer' => $invoice->buyer,
                'vatPayer' => $invoice->vat_payer,
                'vatRate' => (float) $invoice->vat_rate,
                'subtotal' => $invoice->subtotal_cents,
                'vat' => $invoice->vat_cents,
                'reference' => $invoice->workOrder ? Invoicing::jobReference($invoice->workOrder) : null,
                'jobId' => $invoice->work_order_id,
                'lines' => $invoice->lines->map(fn (InvoiceLine $l) => [
                    'description' => $l->description,
                    'quantity' => (float) $l->quantity,
                    'unit' => $l->unit,
                    'unitPrice' => $l->unit_price_cents,
                    'total' => $l->line_total_cents,
                ])->values(),
            ],
        ]);
    }

    /** The number stays used; the job can get a new invoice with the next number. */
    public function void(Invoice $invoice): RedirectResponse
    {
        if ($invoice->voided_at === null) {
            $invoice->update(['voided_at' => Date::now()]);
            ActivityLog::record('invoice.voided', $invoice->workOrder, ['invoice' => $invoice->displayNumber()]);
        }

        return back()->with('status', 'saved');
    }
}
