<?php

namespace App\Support;

use App\Models\ActivityLog;
use App\Models\Invoice;
use App\Models\Vehicle;
use App\Models\WorkOrder;
use App\Models\WorkOrderLine;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Invoice maths and issuing (docs/SCOPE.md): one series, numbers never reused, an issued invoice is a frozen
 * copy of the seller, buyer and lines. Prices are without VAT; VAT is added on the total when the company pays VAT.
 */
final class Invoicing
{
    /** Units a line can have. Stored as these codes, shown translated. */
    public const UNITS = ['h', 'pcs', 'l', 'set'];

    /**
     * @param  iterable<array{quantity: float|string, unit_price_cents: int}>|Collection<int, WorkOrderLine>  $lines
     * @return array{subtotal: int, vat: int, total: int}
     */
    public static function totals(iterable $lines, bool $vatPayer, float $vatRate): array
    {
        $subtotal = 0;
        foreach ($lines as $line) {
            $subtotal += self::lineTotal($line['quantity'], $line['unit_price_cents']);
        }
        $vat = $vatPayer ? (int) round($subtotal * $vatRate / 100) : 0;

        return ['subtotal' => $subtotal, 'vat' => $vat, 'total' => $subtotal + $vat];
    }

    public static function lineTotal(float|string $quantity, int $unitPriceCents): int
    {
        return (int) round((float) $quantity * $unitPriceCents);
    }

    /** Issue the job's invoice with the next free number. Returns null when the job already has a valid invoice. */
    public static function issue(WorkOrder $job, string $issuedOn, string $dueOn): ?Invoice
    {
        $invoice = DB::transaction(function () use ($job, $issuedOn, $dueOn) {
            // Lock the job row so two quick clicks cannot issue two invoices.
            $job = WorkOrder::query()->whereKey($job->id)->lockForUpdate()->firstOrFail();
            if ($job->invoices()->whereNull('voided_at')->exists()) {
                return null;
            }
            $job->load(['customer', 'vehicle', 'lines']);

            $series = (string) Settings::get('invoice_series');
            $used = (int) Invoice::query()->where('series', $series)->lockForUpdate()->max('number');
            $number = max((int) Settings::get('invoice_next_number'), $used + 1);

            $vatPayer = (bool) Settings::get('vat_payer');
            $vatRate = $vatPayer ? (float) Settings::get('vat_rate') : 0.0;
            $totals = self::totals($job->lines, $vatPayer, $vatRate);
            $company = (array) Settings::get('company');
            $customer = $job->customer;

            $invoice = Invoice::create([
                'work_order_id' => $job->id,
                'series' => $series,
                'number' => $number,
                'issued_on' => $issuedOn,
                'due_on' => $dueOn,
                'seller' => $company,
                'buyer' => [
                    'name' => $customer->name,
                    'company_code' => $customer->company_code,
                    'vat_code' => $customer->vat_code,
                    'address' => $customer->address,
                    'phone' => $customer->phone,
                    'email' => $customer->email,
                ],
                'vat_payer' => $vatPayer,
                'vat_rate' => $vatRate,
                'subtotal_cents' => $totals['subtotal'],
                'vat_cents' => $totals['vat'],
                'total_cents' => $totals['total'],
            ]);
            foreach ($job->lines->values() as $i => $line) {
                $invoice->lines()->create([
                    'kind' => $line->kind,
                    'description' => $line->description,
                    'quantity' => $line->quantity,
                    'unit' => $line->unit,
                    'unit_price_cents' => $line->unit_price_cents,
                    'line_total_cents' => self::lineTotal($line->quantity, $line->unit_price_cents),
                    'sort_order' => $i,
                ]);
            }
            Settings::set('invoice_next_number', $number + 1);

            return $invoice;
        });

        if ($invoice) {
            ActivityLog::record('invoice.issued', $job, ['invoice' => $invoice->displayNumber(), 'total' => $invoice->total_cents]);
        }

        return $invoice;
    }

    /** The reference printed on the invoice: job number, vehicle and plate. */
    public static function jobReference(WorkOrder $job): string
    {
        $vehicle = $job->vehicle;
        $parts = array_filter([
            '#'.$job->displayNumber(),
            $vehicle?->make_model,
            $vehicle ? Vehicle::formatPlate($vehicle->plate) : null,
        ]);

        return implode(' · ', $parts);
    }
}
