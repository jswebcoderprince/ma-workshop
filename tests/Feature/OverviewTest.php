<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\ClosureSeeder;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Tests\TestCase;

class OverviewTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Date::setTestNow(Date::parse('2026-11-23 11:20:00', 'UTC')); // Monday 13:20 in Vilnius
        $this->actingAs(User::factory()->create());
    }

    public function test_overview_works_with_an_empty_workshop(): void
    {
        $this->get('/')->assertOk()->assertInertia(fn ($page) => $page
            ->component('overview')
            ->where('stats.nextFree', null)
            ->where('stats.bookedThisWeek', 0)
            ->has('workload', 8)
            ->has('mechanics', 0)
            ->has('upcoming', 0));
    }

    public function test_overview_shows_numbers_from_the_schedule(): void
    {
        $this->seed(ClosureSeeder::class);
        $this->seed(DemoSeeder::class);

        $this->get('/')->assertOk()->assertInertia(fn ($page) => $page
            ->component('overview')
            ->where('stats.waitingParts', 1)
            ->where('stats.toCall', 2)
            ->where('stats.overlaps', 2)
            ->where('stats.nextFree.mechanic', 'Tomas')
            ->where('stats.nextFree.date', '2026-11-23')
            // Tomas is free from 13:00, but at 13:20 searches start at the next quarter boundary.
            ->where('stats.nextFree.time', '15:30')
            ->has('workload', 8, fn ($w) => $w->where('week', 48)->etc())
            ->has('mechanics', 4)
            ->has('upcoming', 7, fn ($j) => $j->hasAll(['number', 'customer.name', 'vehicle.plate', 'mechanic.color', 'start.time', 'end.date', 'status'])->etc())
            ->where('counts.toCall', 2));
    }

    public function test_placeholder_pages_render_for_later_phases(): void
    {
        foreach (['calendar', 'jobs', 'customers', 'mechanics', 'invoices'] as $page) {
            $this->get("/$page")->assertOk()->assertInertia(fn ($p) => $p->component('placeholder')->where('page', $page));
        }
    }
}
