<?php

namespace Tests\Feature;

use App\Enums\NotifyDirection;
use App\Models\ActivityLog;
use App\Models\Customer;
use App\Models\Mechanic;
use App\Models\User;
use App\Models\WorkOrder;
use Database\Seeders\ClosureSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Tests\TestCase;

class JobActionsTest extends TestCase
{
    use RefreshDatabase;

    private Mechanic $tomas;

    private Mechanic $mantas;

    protected function setUp(): void
    {
        parent::setUp();
        Date::setTestNow(Date::parse('2026-11-23 08:00:00', 'UTC'));
        $this->actingAs(User::factory()->create());
        $this->tomas = Mechanic::create(['name' => 'Tomas', 'vehicle_types' => ['car'], 'work_days' => [1, 2, 3, 4, 5, 6]]);
        $this->mantas = Mechanic::create(['name' => 'Mantas', 'vehicle_types' => ['car'], 'work_days' => [1, 2, 3, 4, 5]]);
    }

    private function job(Mechanic $m, string $date, int $q, int $dur, string $status = 'scheduled'): WorkOrder
    {
        $c = Customer::firstOrCreate(['name' => 'Jonas'], ['phone' => '+370 600 11111']);

        return WorkOrder::create(['customer_id' => $c->id, 'mechanic_id' => $m->id, 'description' => 'Sankaba', 'start_date' => $date, 'start_quarter' => $q, 'duration_quarters' => $dur, 'status' => $status]);
    }

    public function test_moving_to_an_earlier_day_marks_the_customer_to_call(): void
    {
        $job = $this->job($this->tomas, '2026-11-26', 0, 4);

        $this->post("/jobs/{$job->id}/move", ['mechanic_id' => $this->tomas->id, 'date' => '2026-11-24', 'quarter' => 1])->assertSessionHasNoErrors()->assertSessionMissing('warning');

        $job->refresh();
        $this->assertSame(['2026-11-24', 1], [$job->start_date->format('Y-m-d'), $job->start_quarter]);
        $this->assertSame(NotifyDirection::Earlier, $job->notify_customer);
        $this->assertSame(1, ActivityLog::where('action', 'job.moved')->count());
    }

    public function test_moving_later_or_to_another_mechanic(): void
    {
        $job = $this->job($this->tomas, '2026-11-24', 0, 2);

        $this->post("/jobs/{$job->id}/move", ['mechanic_id' => $this->mantas->id, 'date' => '2026-11-24', 'quarter' => 2]);
        $this->assertNull($job->fresh()->notify_customer, 'same day: no call needed');
        $this->assertSame($this->mantas->id, $job->fresh()->mechanic_id);

        $this->post("/jobs/{$job->id}/move", ['mechanic_id' => $this->mantas->id, 'date' => '2026-11-30', 'quarter' => 0]);
        $this->assertSame(NotifyDirection::Later, $job->fresh()->notify_customer);
    }

    public function test_started_jobs_do_not_ask_to_call(): void
    {
        $job = $this->job($this->tomas, '2026-11-23', 0, 4, 'in_progress');
        $this->post("/jobs/{$job->id}/move", ['mechanic_id' => $this->tomas->id, 'date' => '2026-11-25', 'quarter' => 0]);
        $this->assertNull($job->fresh()->notify_customer);
    }

    public function test_move_warns_about_overlaps_but_nothing_else_moves(): void
    {
        $other = $this->job($this->mantas, '2026-11-25', 0, 4);
        $job = $this->job($this->tomas, '2026-11-24', 0, 4);

        $this->post("/jobs/{$job->id}/move", ['mechanic_id' => $this->mantas->id, 'date' => '2026-11-25', 'quarter' => 2])
            ->assertSessionHas('warning', 'Moved, but it now overlaps another job of Mantas.');

        $this->assertSame(['2026-11-25', 0], [$other->fresh()->start_date->format('Y-m-d'), $other->fresh()->start_quarter], 'the other job stays');
    }

    public function test_cannot_move_into_closed_time(): void
    {
        $this->seed(ClosureSeeder::class);
        $job = $this->job($this->tomas, '2026-11-24', 0, 2);

        $this->post("/jobs/{$job->id}/move", ['mechanic_id' => $this->tomas->id, 'date' => '2026-11-29', 'quarter' => 0])->assertSessionHasErrors('date'); // Sunday
        $this->post("/jobs/{$job->id}/move", ['mechanic_id' => $this->tomas->id, 'date' => '2026-11-28', 'quarter' => 2])->assertSessionHasErrors('date'); // Saturday has 2 quarters
        $this->post("/jobs/{$job->id}/move", ['mechanic_id' => $this->tomas->id, 'date' => '2026-12-24', 'quarter' => 0])->assertSessionHasErrors('date'); // Kūčios
        $this->post("/jobs/{$job->id}/move", ['mechanic_id' => 999, 'date' => '2026-11-25', 'quarter' => 0])->assertSessionHasErrors('mechanic_id');
        $this->assertSame('2026-11-24', $job->fresh()->start_date->format('Y-m-d'));
    }

    public function test_mark_informed_clears_the_flag(): void
    {
        $job = $this->job($this->tomas, '2026-11-26', 0, 4);
        $job->update(['notify_customer' => NotifyDirection::Later]);

        $this->post("/jobs/{$job->id}/informed")->assertSessionHasNoErrors();

        $this->assertNull($job->fresh()->notify_customer);
        $this->assertSame(['was' => 'later'], ActivityLog::firstWhere('action', 'job.informed')->changes);
    }
}
