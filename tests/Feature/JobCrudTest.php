<?php

namespace Tests\Feature;

use App\Enums\WorkOrderStatus;
use App\Models\ActivityLog;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Mechanic;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\WorkOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Tests\TestCase;

class JobCrudTest extends TestCase
{
    use RefreshDatabase;

    private Mechanic $tomas;

    private Customer $jonas;

    private Vehicle $audi;

    protected function setUp(): void
    {
        parent::setUp();
        Date::setTestNow(Date::parse('2026-11-23 11:20:00', 'UTC')); // Monday 13:20 in Vilnius: third quarter (13:00–15:30)
        $this->actingAs(User::factory()->create());
        $this->tomas = Mechanic::create(['name' => 'Tomas', 'vehicle_types' => ['car'], 'work_days' => [1, 2, 3, 4, 5, 6]]);
        $this->jonas = Customer::create(['name' => 'Jonas Petraitis', 'phone' => '+370 600 11111']);
        $this->audi = Vehicle::create(['customer_id' => $this->jonas->id, 'type' => 'car', 'make_model' => 'Audi A4', 'plate' => 'ABC123']);
    }

    /** @return array<string, mixed> */
    private function booking(array $over = []): array
    {
        return array_replace([
            'customer_id' => $this->jonas->id,
            'vehicle_id' => $this->audi->id,
            'mechanic_id' => $this->tomas->id,
            'description' => 'Pakeisti sankabą',
            'date' => '2026-11-24',
            'quarter' => 1,
            'duration' => 6,
            'mileage' => 182000,
            'view' => 'week',
        ], $over);
    }

    public function test_booking_for_an_existing_customer_and_vehicle(): void
    {
        $response = $this->post('/jobs', $this->booking());

        $job = WorkOrder::sole();
        $response->assertRedirect(route('calendar', ['view' => 'week', 'date' => '2026-11-24', 'job' => $job->id]))
            ->assertSessionHas('status', 'saved')->assertSessionMissing('warning');
        $this->assertSame([$this->jonas->id, $this->audi->id, $this->tomas->id], [$job->customer_id, $job->vehicle_id, $job->mechanic_id]);
        $this->assertSame(['2026-11-24', 1, 6, 6], [$job->start_date->format('Y-m-d'), $job->start_quarter, $job->duration_quarters, $job->planned_quarters]);
        $this->assertSame(WorkOrderStatus::Scheduled, $job->status);
        $this->assertSame(182000, $job->mileage);
        $this->assertSame(1, ActivityLog::where('action', 'job.created')->count());
    }

    public function test_booking_with_a_new_customer_and_vehicle(): void
    {
        $this->post('/jobs', $this->booking([
            'customer_id' => null,
            'customer' => ['name' => 'Ona Kazlauskienė', 'phone' => '+370 611 22222'],
            'vehicle_id' => null,
            'vehicle' => ['type' => 'moto', 'make_model' => 'Yamaha MT-07', 'year' => 2019, 'plate' => '12 abc'],
        ]))->assertSessionHasNoErrors();

        $ona = Customer::firstWhere('name', 'Ona Kazlauskienė');
        $this->assertNotNull($ona);
        $this->assertSame('12ABC', $ona->vehicles()->sole()->plate);
        $this->assertSame($ona->id, WorkOrder::sole()->customer_id);
    }

    public function test_existing_customer_can_get_a_new_vehicle(): void
    {
        $this->post('/jobs', $this->booking(['vehicle_id' => null, 'vehicle' => ['type' => 'car', 'make_model' => 'VW Golf']]))->assertSessionHasNoErrors();

        $this->assertSame(2, $this->jonas->vehicles()->count());
        $this->assertSame('VW Golf', WorkOrder::sole()->vehicle->make_model);
    }

    public function test_booking_is_validated(): void
    {
        $other = Customer::create(['name' => 'Kitas']);
        $theirs = Vehicle::create(['customer_id' => $other->id, 'type' => 'car', 'make_model' => 'Opel']);

        $this->post('/jobs', $this->booking(['vehicle_id' => $theirs->id]))->assertSessionHasErrors('vehicle_id');
        $this->post('/jobs', $this->booking(['date' => '2026-11-29']))->assertSessionHasErrors('date'); // Sunday
        $this->post('/jobs', $this->booking(['date' => '2026-11-28', 'quarter' => 2]))->assertSessionHasErrors('date'); // Saturday has 2 quarters
        $this->post('/jobs', $this->booking(['customer_id' => null]))->assertSessionHasErrors('customer.name');
        $this->post('/jobs', $this->booking(['description' => '', 'duration' => 41]))->assertSessionHasErrors(['description', 'duration']);

        $this->tomas->update(['active' => false]);
        $this->post('/jobs', $this->booking())->assertSessionHasErrors('mechanic_id');

        $this->assertSame(0, WorkOrder::count());
    }

    public function test_overlapping_booking_is_saved_with_a_warning(): void
    {
        $this->post('/jobs', $this->booking(['date' => '2026-11-25', 'quarter' => 0, 'duration' => 4]));
        $this->post('/jobs', $this->booking(['date' => '2026-11-25', 'quarter' => 2, 'duration' => 2]))
            ->assertSessionHas('warning', 'Saved, but it overlaps another job of Tomas.');

        $this->assertSame(2, WorkOrder::count());
    }

    public function test_duration_changes_never_move_other_jobs(): void
    {
        $this->post('/jobs', $this->booking(['date' => '2026-11-25', 'quarter' => 0, 'duration' => 2]));
        $this->post('/jobs', $this->booking(['date' => '2026-11-25', 'quarter' => 2, 'duration' => 2]));
        [$first, $second] = WorkOrder::orderBy('id')->get()->all();

        $this->post("/jobs/{$first->id}/duration", ['delta' => 2])->assertSessionHas('warning');
        $this->assertSame(4, $first->fresh()->duration_quarters);
        $this->assertSame(2, $first->fresh()->planned_quarters, 'the original estimate is kept');
        $this->assertSame(2, $second->fresh()->start_quarter, 'the next job stays where it was');

        $this->post("/jobs/{$first->id}/duration", ['delta' => -10]);
        $this->assertSame(1, $first->fresh()->duration_quarters, 'never below one quarter');

        $this->post("/jobs/{$first->id}/duration", ['quarters' => 12]);
        $this->assertSame(12, $first->fresh()->duration_quarters);
        $this->post("/jobs/{$first->id}/duration", [])->assertSessionHasErrors();
    }

    public function test_completed_now_frees_the_rest_of_the_time(): void
    {
        // Started this morning for two days; at 13:20 it is finished.
        $this->post('/jobs', $this->booking(['date' => '2026-11-23', 'quarter' => 0, 'duration' => 8]));
        $job = WorkOrder::sole();
        $this->post("/jobs/{$job->id}/status", ['status' => 'in_progress']);

        $this->post("/jobs/{$job->id}/status", ['status' => 'completed', 'finish_now' => true])->assertSessionHasNoErrors();

        $job->refresh();
        $this->assertSame(WorkOrderStatus::Completed, $job->status);
        $this->assertSame(3, $job->duration_quarters, 'cut at the end of the current quarter (15:30)');
        $this->assertNotNull($job->completed_at);

        $this->post("/jobs/{$job->id}/status", ['status' => 'scheduled']);
        $this->assertNull($job->fresh()->completed_at);
        $this->post("/jobs/{$job->id}/status", ['status' => 'lost'])->assertSessionHasErrors('status');
    }

    public function test_completed_without_finish_now_keeps_the_length(): void
    {
        $this->post('/jobs', $this->booking(['date' => '2026-11-23', 'quarter' => 0, 'duration' => 8]));
        $job = WorkOrder::sole();

        $this->post("/jobs/{$job->id}/status", ['status' => 'completed']);

        $this->assertSame(8, $job->fresh()->duration_quarters);
    }

    public function test_details_can_be_edited(): void
    {
        $this->post('/jobs', $this->booking());
        $job = WorkOrder::sole();
        $golf = Vehicle::create(['customer_id' => $this->jonas->id, 'type' => 'car', 'make_model' => 'VW Golf']);
        $foreign = Vehicle::create(['customer_id' => Customer::create(['name' => 'Kitas'])->id, 'type' => 'car', 'make_model' => 'Opel']);

        $this->patch("/jobs/{$job->id}", ['description' => 'Sankaba ir smagratis', 'mileage' => 182500, 'vehicle_id' => $golf->id])->assertSessionHasNoErrors();
        $this->assertSame(['Sankaba ir smagratis', 182500, $golf->id], [$job->fresh()->description, $job->fresh()->mileage, $job->fresh()->vehicle_id]);

        $this->patch("/jobs/{$job->id}", ['description' => 'x', 'vehicle_id' => $foreign->id])->assertSessionHasErrors('vehicle_id');
    }

    public function test_delete_unless_invoiced(): void
    {
        $this->post('/jobs', $this->booking());
        $this->post('/jobs', $this->booking(['date' => '2026-11-26']));
        [$a, $b] = WorkOrder::orderBy('id')->get()->all();

        $this->delete("/jobs/{$a->id}?view=month&date=2026-11-24")->assertRedirect(route('calendar', ['view' => 'month', 'date' => '2026-11-24']));
        $this->assertModelMissing($a);
        $this->assertSame(1, ActivityLog::where('action', 'job.deleted')->count());

        Invoice::create([
            'work_order_id' => $b->id, 'series' => 'MAE', 'number' => 1, 'issued_on' => '2026-11-26', 'due_on' => '2026-12-10',
            'seller' => [], 'buyer' => [], 'vat_payer' => true, 'vat_rate' => 21, 'subtotal_cents' => 0, 'vat_cents' => 0, 'total_cents' => 0,
        ]);
        $this->delete("/jobs/{$b->id}")->assertSessionHasErrors('job');
        $this->assertModelExists($b);
    }
}
