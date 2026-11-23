<?php

namespace Tests\Feature;

use App\Enums\WorkOrderStatus;
use App\Models\Closure;
use App\Models\Customer;
use App\Models\Mechanic;
use App\Models\TimeOff;
use App\Models\Vehicle;
use App\Models\WorkOrder;
use App\Scheduling\Position;
use App\Scheduling\Schedule;
use App\Support\Settings;
use App\Support\Workshop;
use Database\Seeders\ClosureSeeder;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Tests\TestCase;

class WorkshopDataTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Monday 23 Nov 2026, 12:00 in Vilnius
        Date::setTestNow(Date::parse('2026-11-23 10:00:00', 'UTC'));
    }

    private function mechanic(array $days = [1, 2, 3, 4, 5, 6]): Mechanic
    {
        return Mechanic::create(['name' => 'Test', 'vehicle_types' => ['car'], 'work_days' => $days]);
    }

    private function order(Mechanic $m, string $date, int $q, int $dur, array $extra = []): WorkOrder
    {
        $c = Customer::firstOrCreate(['name' => 'Jonas Jonaitis'], ['phone' => '+370 600 11111']);

        return WorkOrder::create(array_merge([
            'customer_id' => $c->id, 'mechanic_id' => $m->id, 'description' => 'Test',
            'start_date' => $date, 'start_quarter' => $q, 'duration_quarters' => $dur,
        ], $extra));
    }

    public function test_work_orders_get_numbers_and_planned_duration(): void
    {
        $m = $this->mechanic();
        $a = $this->order($m, '2026-11-24', 0, 4);
        $b = $this->order($m, '2026-11-25', 0, 2);
        $this->assertSame([1, 2], [$a->number, $b->number]);
        $this->assertSame('0002', $b->displayNumber());
        $this->assertSame(4, $a->planned_quarters);
        $this->assertSame(WorkOrderStatus::Scheduled, $a->fresh()->status);
    }

    public function test_now_uses_the_workshop_timezone(): void
    {
        // 10:00 UTC = 12:00 in Vilnius → inside quarter 1 (10:30–13:00); next boundary 13:00 = quarter 2
        $w = app(Workshop::class);
        $this->assertSame('2026-11-23#1', $w->currentQuarter()->key());
        $this->assertSame('2026-11-23#2', $w->nextQuarter()->key());
    }

    public function test_schedule_from_database_uses_closures_time_off_and_jobs(): void
    {
        $this->seed(ClosureSeeder::class);
        $m = $this->mechanic();
        TimeOff::create(['mechanic_id' => $m->id, 'type' => 'holiday', 'starts_on' => '2026-11-25', 'ends_on' => '2026-11-25']);
        $long = $this->order($m, '2026-12-23', 2, 4);
        $offDay = $this->order($m, '2026-11-24', 2, 4);

        $s = app(Workshop::class)->schedule();
        $this->assertSame('2026-12-28#1', $s->end($long->id)->key(), 'skips Christmas closures and Sunday');
        $this->assertSame(Schedule::MECHANIC_OFF, $s->warning($offDay->id));
        $this->assertEquals(new Position('2026-11-23', 2), $s->earliest($m->id, 2, app(Workshop::class)->nextQuarter()));
    }

    public function test_settings_have_defaults_and_can_be_changed(): void
    {
        $this->assertSame('MAE', Settings::get('invoice_series'));
        $this->assertSame(4, app(Workshop::class)->calendar()->quartersOn('2026-11-23'));

        Settings::set('locale', 'lt');
        Settings::set('hours', array_replace(config('workshop.defaults.hours'), [6 => ['open' => '09:00', 'quarters' => 0]]));

        $this->assertSame('lt', Settings::locale());
        $this->assertSame(0, (new Workshop)->calendar()->quartersOn('2026-11-28'));
    }

    public function test_plates_are_normalized_and_customers_are_searchable(): void
    {
        $c = Customer::create(['name' => 'Rasa Grigaitė', 'phone' => '+370 630 18834']);
        $v = $c->vehicles()->create(['type' => 'car', 'make_model' => 'Nissan Qashqai', 'year' => 2018, 'plate' => 'khr 370']);
        Customer::create(['name' => 'Other Person', 'phone' => '+370 699 00000']);

        $this->assertSame('KHR370', $v->plate);
        $this->assertSame('KHR 370', Vehicle::formatPlate($v->plate));
        $this->assertSame('Nissan Qashqai 2018 · KHR 370', $v->label());

        foreach (['grigait', 'KHR370', 'khr 370', '630 188', '+37063018834', 'Qashqai'] as $term) {
            $this->assertSame(['Rasa Grigaitė'], Customer::search($term)->pluck('name')->all(), "search: $term");
        }
    }

    public function test_demo_seeder_builds_a_realistic_schedule(): void
    {
        $this->seed(ClosureSeeder::class);
        $this->seed(DemoSeeder::class);

        $this->assertSame(4, Mechanic::count());
        $this->assertSame(32, Customer::count());
        $this->assertSame(16, Closure::count());

        $w = app(Workshop::class);
        $s = $w->schedule();
        $warnings = WorkOrder::all()->filter(fn ($j) => $s->warning($j->id) !== null);
        $this->assertCount(2, $warnings, 'the demo has one extended job overlapping the next one');
        $this->assertNotEmpty($s->earlierCandidates($w->nextQuarter()));
        $this->assertSame(1, WorkOrder::where('status', 'waiting_parts')->count());
        $this->assertSame(2, WorkOrder::whereNotNull('notify_customer')->count());
    }
}
