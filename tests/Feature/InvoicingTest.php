<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Mechanic;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\WorkOrder;
use App\Support\Invoicing;
use App\Support\Settings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Job lines, invoice numbers, VAT and voiding (docs/SCOPE.md: simple invoices, numbers never reused). */
class InvoicingTest extends TestCase
{
    use RefreshDatabase;

    private WorkOrder $job;

    protected function setUp(): void
    {
        parent::setUp();
        Date::setTestNow(Date::parse('2026-11-23 08:00:00', 'UTC'));
        $this->actingAs(User::factory()->create());
        $mechanic = Mechanic::create(['name' => 'Tomas', 'vehicle_types' => ['car'], 'work_days' => [1, 2, 3, 4, 5]]);
        $customer = Customer::create(['name' => 'UAB Ratai', 'phone' => '+370 600 11111', 'company_code' => '300111222', 'vat_code' => 'LT100001112', 'address' => 'Kauno g. 1, Prienai']);
        $vehicle = Vehicle::create(['customer_id' => $customer->id, 'type' => 'car', 'make_model' => 'Audi A4', 'plate' => 'ABC123']);
        $this->job = WorkOrder::create([
            'customer_id' => $customer->id, 'vehicle_id' => $vehicle->id, 'mechanic_id' => $mechanic->id,
            'description' => 'Sankabos keitimas', 'start_date' => '2026-11-23', 'start_quarter' => 0, 'duration_quarters' => 4,
        ]);
        Settings::setMany(['vat_payer' => true, 'vat_rate' => 21, 'invoice_series' => 'MAE', 'invoice_next_number' => 1, 'payment_days' => 14]);
    }

    private function addLines(): void
    {
        $this->post("/jobs/{$this->job->id}/lines", ['kind' => 'labour', 'description' => 'Sankabos keitimas', 'quantity' => '3,5', 'unit' => 'h', 'unit_price' => '40'])->assertSessionHasNoErrors();
        $this->post("/jobs/{$this->job->id}/lines", ['kind' => 'part', 'description' => 'Sankabos komplektas', 'quantity' => '1', 'unit' => 'set', 'unit_price' => '245,99'])->assertSessionHasNoErrors();
    }

    private function issue(): TestResponse
    {
        return $this->post("/jobs/{$this->job->id}/invoice", ['issued_on' => '2026-11-23', 'due_on' => '2026-12-07']);
    }

    public function test_lines_are_added_edited_and_removed_with_euro_prices(): void
    {
        $this->addLines();
        [$labour, $part] = $this->job->lines()->get()->all();
        $this->assertSame(['labour', 3.5, 4000], [$labour->kind->value, (float) $labour->quantity, $labour->unit_price_cents]);
        $this->assertSame(['part', 24599], [$part->kind->value, $part->unit_price_cents]);

        $this->patch("/lines/{$part->id}", ['kind' => 'part', 'description' => 'Sankabos komplektas LUK', 'quantity' => 1, 'unit' => 'set', 'unit_price' => '250.00'])->assertSessionHasNoErrors();
        $this->assertSame(25000, $part->fresh()->unit_price_cents);

        $this->delete("/lines/{$labour->id}")->assertSessionHasNoErrors();
        $this->assertSame(1, $this->job->lines()->count());
        $this->assertSame(1, ActivityLog::where('action', 'job.line_removed')->count());
    }

    public function test_line_validation(): void
    {
        $this->post("/jobs/{$this->job->id}/lines", ['kind' => 'other', 'description' => '', 'quantity' => '0', 'unit' => 'kg', 'unit_price' => '-1'])
            ->assertSessionHasErrors(['kind', 'description', 'quantity', 'unit', 'unit_price']);
    }

    public function test_totals_with_vat_and_without(): void
    {
        $lines = [['quantity' => 3.5, 'unit_price_cents' => 4000], ['quantity' => 1, 'unit_price_cents' => 24599]];
        $this->assertSame(['subtotal' => 38599, 'vat' => 8106, 'total' => 46705], Invoicing::totals($lines, true, 21));
        $this->assertSame(['subtotal' => 38599, 'vat' => 0, 'total' => 38599], Invoicing::totals($lines, false, 21));
    }

    public function test_issuing_freezes_seller_buyer_lines_and_uses_the_next_number(): void
    {
        Settings::set('invoice_next_number', 41);
        Settings::set('company', ['name' => 'MA Engine Lab', 'code' => '305000000', 'vat_code' => 'LT100000001', 'address' => 'Prienai', 'bank' => 'LT00 0000', 'phone' => '', 'email' => '']);
        $this->addLines();

        $this->issue()->assertSessionHasNoErrors();
        $invoice = Invoice::sole();
        $this->assertSame('MAE-0041', $invoice->displayNumber());
        $this->assertSame([38599, 8106, 46705], [$invoice->subtotal_cents, $invoice->vat_cents, $invoice->total_cents]);
        $this->assertSame('305000000', $invoice->seller['code']);
        $this->assertSame(['UAB Ratai', '300111222', 'LT100001112'], [$invoice->buyer['name'], $invoice->buyer['company_code'], $invoice->buyer['vat_code']]);
        $this->assertSame(2, $invoice->lines()->count());
        $this->assertSame(42, (int) Settings::get('invoice_next_number'));

        // Later changes to the customer or the settings do not touch the issued invoice.
        $this->job->customer->update(['name' => 'Kitas pavadinimas']);
        Settings::set('vat_rate', 9);
        $this->assertSame('UAB Ratai', $invoice->fresh()->buyer['name']);
        $this->assertSame('21.00', $invoice->fresh()->vat_rate);
    }

    public function test_a_job_without_lines_or_with_a_valid_invoice_cannot_be_invoiced_again(): void
    {
        $this->issue()->assertSessionHasErrors('invoice');
        $this->addLines();
        $this->issue()->assertSessionHasNoErrors();
        $this->issue()->assertSessionHasErrors('invoice');
        $this->assertSame(1, Invoice::count());
    }

    public function test_lines_are_locked_while_the_invoice_is_valid(): void
    {
        $this->addLines();
        $this->issue();
        $line = $this->job->lines()->first();

        $this->post("/jobs/{$this->job->id}/lines", ['kind' => 'part', 'description' => 'x', 'quantity' => 1, 'unit' => 'pcs', 'unit_price' => 1])->assertSessionHasErrors('lines');
        $this->patch("/lines/{$line->id}", ['kind' => 'part', 'description' => 'x', 'quantity' => 1, 'unit' => 'pcs', 'unit_price' => 1])->assertSessionHasErrors('lines');
        $this->delete("/lines/{$line->id}")->assertSessionHasErrors('lines');
        $this->assertSame(2, $this->job->lines()->count());
    }

    public function test_voiding_keeps_the_number_and_a_new_invoice_gets_the_next_one(): void
    {
        $this->addLines();
        $this->issue();
        $first = Invoice::sole();

        $this->post("/invoices/{$first->id}/void")->assertSessionHasNoErrors();
        $this->assertNotNull($first->fresh()->voided_at);
        // Unlocked again: fix a line and issue a new invoice.
        $this->post("/jobs/{$this->job->id}/lines", ['kind' => 'part', 'description' => 'Guolis', 'quantity' => 1, 'unit' => 'pcs', 'unit_price' => 18])->assertSessionHasNoErrors();
        $this->issue()->assertSessionHasNoErrors();

        $numbers = Invoice::orderBy('id')->get()->map->displayNumber()->all();
        $this->assertSame(['MAE-0001', 'MAE-0002'], $numbers);
        $this->assertSame(Invoice::latest('id')->first()->id, $this->job->invoice()->first()->id);
        // Never reused, even if someone sets the counter back.
        Settings::set('invoice_next_number', 1);
        $this->post('/invoices/'.Invoice::latest('id')->first()->id.'/void');
        $this->issue();
        $this->assertSame('MAE-0003', Invoice::latest('id')->first()->displayNumber());
    }

    public function test_jobs_with_invoices_cannot_be_deleted_even_when_voided(): void
    {
        $this->addLines();
        $this->issue();
        $this->post('/invoices/'.Invoice::sole()->id.'/void');
        $this->delete("/jobs/{$this->job->id}")->assertSessionHasErrors('job');
        $this->assertModelExists($this->job);
    }

    public function test_non_vat_payer_invoice(): void
    {
        Settings::set('vat_payer', false);
        $this->addLines();
        $this->issue();
        $invoice = Invoice::sole();
        $this->assertFalse($invoice->vat_payer);
        $this->assertSame([38599, 0, 38599], [$invoice->subtotal_cents, $invoice->vat_cents, $invoice->total_cents]);
    }

    public function test_pages_render(): void
    {
        $this->addLines();
        $this->get("/jobs/{$this->job->id}")->assertInertia(fn (Assert $p) => $p
            ->component('jobs/show')
            ->where('job.number', '0001')
            ->has('lines', 2)
            ->where('totals.total', 46705)
            ->where('invoice', null)
            ->where('billing.nextNumber', 'MAE-0001'));

        $this->get("/jobs/{$this->job->id}/card")->assertInertia(fn (Assert $p) => $p->component('print/job-card')->has('lines', 2));

        $this->issue();
        $invoice = Invoice::sole();
        $this->get("/invoices/{$invoice->id}")->assertInertia(fn (Assert $p) => $p
            ->component('print/invoice')
            ->where('invoice.number', 'MAE-0001')
            ->where('invoice.reference', '#0001 · Audi A4 · ABC 123')
            ->has('invoice.lines', 2));

        $this->get('/invoices?q=ratai')->assertInertia(fn (Assert $p) => $p
            ->component('invoices/index')
            ->has('invoices.data', 1)
            ->where('summary.monthTotal', 46705));
        $this->get('/invoices?q=nobody')->assertInertia(fn (Assert $p) => $p->has('invoices.data', 0));
        $this->get('/invoices?status=voided')->assertInertia(fn (Assert $p) => $p->has('invoices.data', 0));
    }
}
