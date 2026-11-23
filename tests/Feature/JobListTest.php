<?php

namespace Tests\Feature;

use App\Enums\NotifyDirection;
use App\Enums\WorkOrderStatus;
use App\Models\Customer;
use App\Models\Mechanic;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\WorkOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class JobListTest extends TestCase
{
    use RefreshDatabase;

    private Mechanic $tomas;

    private Mechanic $mantas;

    protected function setUp(): void
    {
        parent::setUp();
        Date::setTestNow(Date::parse('2026-11-23 08:00:00', 'UTC'));
        $this->actingAs(User::factory()->create());
        $this->tomas = Mechanic::create(['name' => 'Tomas', 'vehicle_types' => ['car'], 'work_days' => [1, 2, 3, 4, 5], 'sort_order' => 1]);
        $this->mantas = Mechanic::create(['name' => 'Mantas', 'vehicle_types' => ['car'], 'work_days' => [1, 2, 3, 4, 5], 'sort_order' => 2]);

        $this->job('Jonas Petraitis', 'BMW 320d', 'KHR370', $this->tomas, '2026-11-24', 'Variklio diagnostika');
        $this->job('Ona Kazlauskienė', 'Audi A4', 'ABC123', $this->tomas, '2026-11-25', 'Sankabos keitimas', ['notify_customer' => NotifyDirection::Later]);
        $this->job('Petras Jonaitis', 'VW Golf', 'XYZ999', $this->mantas, '2026-11-20', 'Alyvos keitimas', ['status' => WorkOrderStatus::Completed]);
        // Overlaps Ona's job on Wednesday.
        $this->job('Rasa Rimkė', 'Opel Astra', 'RRR111', $this->tomas, '2026-11-25', 'Stabdžių remontas');
    }

    private function job(string $name, string $make, string $plate, Mechanic $m, string $date, string $work, array $extra = []): WorkOrder
    {
        $c = Customer::create(['name' => $name, 'phone' => '+370 600 '.random_int(10000, 99999)]);
        $v = Vehicle::create(['customer_id' => $c->id, 'type' => 'car', 'make_model' => $make, 'plate' => $plate]);

        return WorkOrder::create([
            'customer_id' => $c->id, 'vehicle_id' => $v->id, 'mechanic_id' => $m->id, 'description' => $work,
            'start_date' => $date, 'start_quarter' => 0, 'duration_quarters' => 4,
        ] + $extra);
    }

    public function test_open_jobs_by_date_with_counts(): void
    {
        $this->get('/jobs')->assertInertia(fn (Assert $p) => $p
            ->component('jobs/index')
            ->where('filters.status', 'open')
            ->has('jobs.data', 3)
            ->where('jobs.data.0.description', 'Variklio diagnostika')
            ->where('counts.open', 3)
            ->where('counts.completed', 1)
            ->where('counts.all', 4)
            ->where('counts.call', 1)
            ->where('counts.warning', 2)
            ->has('mechanics', 2));
    }

    public function test_status_mechanic_and_flag_filters(): void
    {
        $this->get('/jobs?status=completed')->assertInertia(fn (Assert $p) => $p->has('jobs.data', 1)->where('jobs.data.0.customer.name', 'Petras Jonaitis'));
        // "All" starts with the newest.
        $this->get('/jobs?status=all')->assertInertia(fn (Assert $p) => $p->has('jobs.data', 4)->where('jobs.data.3.customer.name', 'Petras Jonaitis'));
        $this->get("/jobs?mechanic={$this->mantas->id}&status=all")->assertInertia(fn (Assert $p) => $p->has('jobs.data', 1));
        $this->get('/jobs?flag=call')->assertInertia(fn (Assert $p) => $p->has('jobs.data', 1)->where('jobs.data.0.customer.name', 'Ona Kazlauskienė'));
        $this->get('/jobs?flag=warning')->assertInertia(fn (Assert $p) => $p->has('jobs.data', 2));
        // Unknown values fall back to the defaults.
        $this->get('/jobs?status=nope&flag=nope')->assertInertia(fn (Assert $p) => $p->where('filters.status', 'open')->where('filters.flag', null));
    }

    public function test_search_by_number_name_plate_make_and_work(): void
    {
        $count = fn (string $q) => $this->get('/jobs?'.http_build_query(['q' => $q, 'status' => 'all']))->viewData('page')['props']['jobs']['total'];

        $this->assertSame(1, $count('#0002'));
        $this->assertSame(1, $count('#2'));
        $this->assertSame(2, $count('2')); // bare digits also match plate ABC123 and make BMW 320d
        $this->assertSame(1, $count('ona kaz'));
        $this->assertSame(1, $count('abc 123'));
        $this->assertSame(1, $count('golf'));
        $this->assertSame(1, $count('sankabos'));
        $this->assertSame(0, $count('nothing like this'));
    }

    public function test_guests_are_sent_to_login(): void
    {
        auth()->logout();
        $this->get('/jobs')->assertRedirect('/login');
        $this->get('/invoices')->assertRedirect('/login');
    }
}
