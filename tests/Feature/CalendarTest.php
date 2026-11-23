<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Mechanic;
use App\Models\TimeOff;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\WorkOrder;
use Database\Seeders\ClosureSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Tests\TestCase;

class CalendarTest extends TestCase
{
    use RefreshDatabase;

    private Mechanic $tomas;

    private Mechanic $mantas;

    private Customer $jonas;

    protected function setUp(): void
    {
        parent::setUp();
        Date::setTestNow(Date::parse('2026-11-23 08:00:00', 'UTC')); // Monday 10:00 in Vilnius, inside the first quarter
        $this->actingAs(User::factory()->create());
        $this->tomas = Mechanic::create(['name' => 'Tomas', 'vehicle_types' => ['car'], 'work_days' => [1, 2, 3, 4, 5, 6], 'sort_order' => 1]);
        $this->mantas = Mechanic::create(['name' => 'Mantas', 'vehicle_types' => ['car', 'moto'], 'work_days' => [1, 2, 3, 4, 5], 'sort_order' => 2]);
        $this->jonas = Customer::create(['name' => 'Jonas Petraitis', 'phone' => '+370 600 11111']);
    }

    private function job(Mechanic $m, string $date, int $q, int $dur, array $extra = []): WorkOrder
    {
        return WorkOrder::create(['customer_id' => $this->jonas->id, 'mechanic_id' => $m->id, 'description' => 'Sankaba', 'start_date' => $date, 'start_quarter' => $q, 'duration_quarters' => $dur] + $extra);
    }

    public function test_week_view_starts_on_monday_and_shows_quarters_and_jobs(): void
    {
        $this->job($this->tomas, '2026-11-27', 2, 4); // Fri 13:00, runs into Saturday
        $this->job($this->mantas, '2026-12-02', 0, 2); // next week: not on this board

        $this->get('/calendar?date=2026-11-25')->assertOk()->assertInertia(fn ($page) => $page
            ->component('calendar/index')
            ->where('view', 'week')
            ->where('from', '2026-11-23')
            ->where('today', '2026-11-23')
            ->has('days', 7)
            ->where('days.0.times', ['08:00', '10:30', '13:00', '15:30'])
            ->where('days.0.close', '18:00')
            ->where('days.5.quarters', 2) // Saturday
            ->where('days.6.quarters', 0) // Sunday
            ->has('mechanics', 2)
            ->where('mechanics.1.off.2026-11-28', 'not_working') // Mantas works Mon–Fri
            ->has('jobs', 1)
            ->where('jobs.0.cells', [['2026-11-27', 2], ['2026-11-27', 3], ['2026-11-28', 0], ['2026-11-28', 1]])
            ->where('jobs.0.end.date', '2026-11-28')
            ->where('selected', null));
    }

    public function test_day_and_month_views(): void
    {
        $this->get('/calendar?view=day&date=2026-11-26')->assertInertia(fn ($page) => $page
            ->where('view', 'day')->where('from', '2026-11-26')->has('days', 1));

        $this->get('/calendar?view=month&date=2026-11-26')->assertInertia(fn ($page) => $page
            ->where('view', 'month')->where('from', '2026-11-23')->has('days', 35)->where('days.34.date', '2026-12-27'));

        // Unknown values fall back to safe defaults.
        $this->get('/calendar?view=year&date=nonsense')->assertInertia(fn ($page) => $page
            ->where('view', 'week')->where('anchor', '2026-11-23'));
    }

    public function test_closures_and_time_off_appear_on_the_board(): void
    {
        $this->seed(ClosureSeeder::class);
        TimeOff::create(['mechanic_id' => $this->tomas->id, 'type' => 'holiday', 'starts_on' => '2026-12-21', 'ends_on' => '2026-12-23']);

        $this->get('/calendar?date=2026-12-21')->assertInertia(fn ($page) => $page
            ->where('days.3.date', '2026-12-24')
            ->where('days.3.quarters', 0)
            ->where('days.3.closure', fn ($name) => $name !== null)
            ->where('mechanics.0.off.2026-12-21', 'holiday')
            ->where('mechanics.0.off.2026-12-23', 'holiday')
            ->missing('mechanics.0.off.2026-12-24')); // closed for everyone, not a personal day off
    }

    public function test_mechanic_filter(): void
    {
        $this->job($this->tomas, '2026-11-24', 0, 2);
        $this->job($this->mantas, '2026-11-24', 0, 2);

        $this->get("/calendar?mechanic={$this->mantas->id}")->assertInertia(fn ($page) => $page
            ->has('mechanics', 1)
            ->where('mechanics.0.name', 'Mantas')
            ->has('jobs', 1)
            ->has('options', 2)
            ->where('filters.mechanic', $this->mantas->id));
    }

    public function test_selected_job_has_details_history_and_an_earlier_suggestion(): void
    {
        $vehicle = Vehicle::create(['customer_id' => $this->jonas->id, 'type' => 'car', 'make_model' => 'Audi A4', 'plate' => 'abc123', 'vin' => 'WAUZZZ8K9DA123456']);
        $job = $this->job($this->tomas, '2026-11-26', 0, 4, ['vehicle_id' => $vehicle->id, 'mileage' => 182000]);
        $this->post("/jobs/{$job->id}/duration", ['delta' => 1]);

        $this->get("/calendar?job={$job->id}")->assertInertia(fn ($page) => $page
            ->where('selected.id', $job->id)
            ->where('selected.duration', 5)
            ->where('selected.planned', 4)
            ->where('selected.mileage', 182000)
            ->where('selected.vehicle.plate', 'ABC 123')
            ->where('selected.customer.phone', '+370 600 11111')
            // Tomas is free from the next quarter today (10:30).
            ->where('selected.earlier', ['date' => '2026-11-23', 'quarter' => 1, 'time' => '10:30'])
            ->where('selected.log.0.action', 'job.duration'));
    }

    public function test_slots_give_the_earliest_start_per_mechanic(): void
    {
        $this->job($this->tomas, '2026-11-23', 0, 8); // Tomas busy Mon + Tue

        $rows = $this->getJson('/calendar/slots?duration=4')->assertOk()->json();
        $this->assertSame('Mantas', $rows[0]['mechanic']['name']);
        $this->assertSame(['date' => '2026-11-23', 'quarter' => 1, 'time' => '10:30'], $rows[0]['start']);
        $this->assertSame(['date' => '2026-11-24', 'time' => '10:30'], $rows[0]['end']);
        $this->assertSame(['date' => '2026-11-25', 'quarter' => 0, 'time' => '08:00'], $rows[1]['start']);

        $moto = $this->getJson('/calendar/slots?duration=2&type=moto')->json();
        $this->assertCount(1, $moto);
        $this->assertSame('Mantas', $moto[0]['mechanic']['name']);

        $this->getJson('/calendar/slots?duration=0')->assertStatus(422);
    }

    public function test_check_previews_the_end_and_warnings(): void
    {
        $other = $this->job($this->tomas, '2026-11-25', 0, 4);

        $this->getJson("/calendar/check?mechanic_id={$this->tomas->id}&date=2026-11-24&quarter=2&duration=4")
            ->assertExactJson(['valid' => true, 'end' => ['date' => '2026-11-25', 'time' => '13:00'], 'warning' => 'overlap']);

        // The job itself is ignored when it is the one being changed.
        $this->getJson("/calendar/check?mechanic_id={$this->tomas->id}&date=2026-11-25&quarter=1&duration=2&ignore={$other->id}")
            ->assertJson(['valid' => true, 'warning' => null]);

        $this->getJson("/calendar/check?mechanic_id={$this->tomas->id}&date=2026-11-29&quarter=0&duration=2")
            ->assertExactJson(['valid' => false, 'end' => null, 'warning' => null]); // Sunday
    }

    public function test_guests_are_sent_to_login(): void
    {
        auth()->logout();
        $this->get('/calendar')->assertRedirect('/login');
        $this->getJson('/calendar/slots?duration=2')->assertUnauthorized();
    }
}
