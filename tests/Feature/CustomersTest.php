<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Mechanic;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\WorkOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomersTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create());
    }

    private function customer(string $name, string $phone, ?string $plate = null): Customer
    {
        $c = Customer::create(['name' => $name, 'phone' => $phone]);
        if ($plate) {
            $c->vehicles()->create(['type' => 'car', 'make_model' => 'VW Passat', 'year' => 2014, 'plate' => $plate]);
        }

        return $c;
    }

    private function job(Customer $c, ?Vehicle $v = null, string $status = 'scheduled', string $date = '2026-12-01'): WorkOrder
    {
        $m = Mechanic::firstOrCreate(['name' => 'Tomas'], ['vehicle_types' => ['car'], 'work_days' => [1, 2, 3, 4, 5]]);

        return WorkOrder::create(['customer_id' => $c->id, 'vehicle_id' => $v?->id, 'mechanic_id' => $m->id, 'description' => 'Sankabos keitimas', 'start_date' => $date, 'start_quarter' => 0, 'duration_quarters' => 4, 'status' => $status]);
    }

    public function test_list_search_and_next_visit(): void
    {
        $rasa = $this->customer('Rasa Grigaitė', '+370 630 18834', 'KHR370');
        $this->customer('Jonas Jonaitis', '+370 600 11111');
        $this->job($rasa, $rasa->vehicles->first(), 'completed', '2026-11-02');
        $this->job($rasa, $rasa->vehicles->first(), 'scheduled', '2026-12-01');

        $this->get('/customers')->assertOk()->assertInertia(fn ($page) => $page
            ->component('customers/index')
            ->where('customers.total', 2)
            ->where('customers.data.0.name', 'Jonas Jonaitis')
            ->where('customers.data.1.jobs', 2)
            ->where('customers.data.1.nextVisit', '2026-12-01')
            ->where('customers.data.1.vehicles.0.plate', 'KHR 370')
            ->where('selected', null));

        foreach (['grig', 'khr 370', '630 18834'] as $q) {
            $this->get('/customers?q='.urlencode($q))->assertInertia(fn ($page) => $page
                ->where('filters.q', $q)->where('customers.total', 1)->where('customers.data.0.name', 'Rasa Grigaitė'));
        }
    }

    public function test_list_is_paginated(): void
    {
        foreach (range(1, 30) as $i) {
            Customer::create(['name' => sprintf('Klientas %02d', $i)]);
        }
        $this->get('/customers?page=2')->assertInertia(fn ($page) => $page
            ->where('customers.total', 30)->where('customers.from', 26)->has('customers.data', 5)->where('customers.next', null));
    }

    public function test_customer_sheet_loads_details_vehicles_and_history(): void
    {
        $c = $this->customer('Rasa Grigaitė', '+370 630 18834', 'KHR370');
        $spare = $c->vehicles()->create(['type' => 'moto', 'make_model' => 'Honda CB500F']);
        $this->job($c, $c->vehicles->first());

        $this->get("/customers?customer={$c->id}")->assertInertia(fn ($page) => $page
            ->where('selected.name', 'Rasa Grigaitė')
            ->has('selected.vehicles', 2)
            ->where('selected.vehicles.0.canDelete', false)
            ->where('selected.vehicles.1.id', $spare->id)
            ->where('selected.vehicles.1.canDelete', true)
            ->has('selected.jobs', 1)
            ->where('selected.jobs.0.mechanic', 'Tomas')
            ->where('selected.canDelete', false));
    }

    public function test_create_customer_with_first_vehicle_opens_the_sheet(): void
    {
        $response = $this->post('/customers', [
            'name' => 'Agnė Paulauskaitė', 'phone' => '+370 646 20785', 'email' => 'agne@example.lt',
            'vehicle' => ['type' => 'car', 'make_model' => 'Renault Megane', 'year' => 2015, 'plate' => 'bla 422', 'vin' => 'VF1BZ0B0H12345678'],
        ])->assertSessionHasNoErrors();

        $c = Customer::firstWhere('name', 'Agnė Paulauskaitė');
        $response->assertRedirect(route('customers', ['customer' => $c->id]));
        $this->assertSame('BLA422', $c->vehicles->first()->plate);
    }

    public function test_create_customer_without_vehicle_and_validation(): void
    {
        $this->post('/customers', ['name' => 'Be automobilio', 'vehicle' => ['type' => 'car', 'make_model' => '']])->assertSessionHasNoErrors();
        $this->assertSame(0, Customer::firstWhere('name', 'Be automobilio')->vehicles()->count());

        $this->post('/customers', ['name' => '', 'phone' => 'call me', 'email' => 'x', 'vehicle' => ['make_model' => 'Audi', 'type' => 'truck', 'year' => 1800]])
            ->assertSessionHasErrors(['name', 'phone', 'email', 'vehicle.type', 'vehicle.year']);
    }

    public function test_update_customer_and_manage_vehicles(): void
    {
        $c = $this->customer('Rasa', '+370 630 18834');
        $this->patch("/customers/{$c->id}", ['name' => 'Rasa Grigaitė', 'phone' => '+370 630 18834', 'company_code' => '305123456'])->assertSessionHasNoErrors();
        $this->assertSame(['Rasa Grigaitė', '305123456'], [$c->fresh()->name, $c->fresh()->company_code]);

        $this->post("/customers/{$c->id}/vehicles", ['type' => 'water', 'make_model' => 'Sea-Doo GTI 130', 'year' => 2017])->assertSessionHasNoErrors();
        $v = $c->vehicles()->first();
        $this->patch("/vehicles/{$v->id}", ['type' => 'water', 'make_model' => 'Sea-Doo GTI 170', 'plate' => ''])->assertSessionHasNoErrors();
        $this->assertSame('Sea-Doo GTI 170', $v->fresh()->make_model);
        $this->assertNull($v->fresh()->plate);

        $this->delete("/vehicles/{$v->id}")->assertSessionHasNoErrors();
        $this->assertModelMissing($v);
    }

    public function test_records_with_jobs_cannot_be_deleted(): void
    {
        $c = $this->customer('Rasa', '+370 630 18834', 'KHR370');
        $v = $c->vehicles->first();
        $this->job($c, $v);

        $this->delete("/vehicles/{$v->id}")->assertSessionHasErrors('vehicle');
        $this->delete("/customers/{$c->id}")->assertSessionHasErrors('customer');
        $this->assertModelExists($c);

        $empty = $this->customer('Tuščias', '+370 600 00000');
        $this->delete("/customers/{$empty->id}")->assertRedirect(route('customers'));
        $this->assertModelMissing($empty);
    }

    public function test_search_endpoint_for_the_job_form(): void
    {
        $this->customer('Rasa Grigaitė', '+370 630 18834', 'KHR370');
        $this->customer('Jonas Jonaitis', '+370 600 11111');

        $this->getJson('/customers/search?q=KHR')->assertOk()->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Rasa Grigaitė')
            ->assertJsonPath('0.vehicles.0.plate', 'KHR 370');
        $this->getJson('/customers/search?q=')->assertJsonCount(2);
    }
}
