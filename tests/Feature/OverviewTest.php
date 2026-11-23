<?php

namespace Tests\Feature;

use App\Models\Mechanic;
use App\Models\TimeOff;
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
            ->where('today.date', '2026-11-23')
            ->where('today.week', 48)
            ->where('stats.nextFree', null)
            ->where('stats.jobsToday.total', 0)
            ->has('workload', 8)
            ->has('lanes', 0)
            ->has('attention', 0)
            ->where('shell.hours.open', '08:00')
            ->where('shell.hours.close', '18:00')
            ->has('shell.roster', 0));
    }

    public function test_overview_shows_today_per_mechanic_and_what_needs_attention(): void
    {
        $this->seed(ClosureSeeder::class);
        $this->seed(DemoSeeder::class);

        $this->get('/')->assertOk()->assertInertia(fn ($page) => $page
            ->component('overview')
            ->where('stats.jobsToday.total', 8)
            ->where('stats.mechanics.working', 4)
            ->where('stats.mechanics.total', 4)
            ->where('stats.warnings.total', 2)
            ->where('stats.toCall.total', 2)
            ->where('stats.toCall.earlier', 1)
            ->where('stats.toCall.later', 1)
            // Tomas is free from 13:00, but at 13:20 searches start at the next quarter boundary.
            ->where('stats.nextFree.mechanic', 'Tomas')
            ->where('stats.nextFree.time', '15:30')
            ->has('lanes', 4)
            ->where('lanes.0.name', 'Tomas')
            ->where('lanes.0.jobs.0.status', 'completed')
            ->where('lanes.0.jobs.0.from', '08:00')
            ->where('lanes.0.jobs.0.to', '13:00')
            // 13:00–15:30 is the running quarter; only 15:30 onwards is offered as free.
            ->where('lanes.0.free.0.from', '15:30')
            ->where('lanes.0.free.0.to', '18:00')
            ->where('attention', fn ($items) => collect($items)->pluck('kind')->countBy()->all() === ['warning' => 2, 'call' => 2, 'earlier' => 3])
            ->where('shell.counts.toCall', 2)
            ->where('shell.counts.warnings', 2)
            ->has('shell.roster', 4)
            ->where('shell.roster.0.status', 'working'));
    }

    public function test_mechanics_off_today_show_their_reason(): void
    {
        $m = Mechanic::create(['name' => 'Rolandas', 'vehicle_types' => ['car'], 'work_days' => [1, 2, 3, 4, 5]]);
        TimeOff::create(['mechanic_id' => $m->id, 'type' => 'holiday', 'starts_on' => '2026-11-23', 'ends_on' => '2026-11-27']);

        $this->get('/')->assertInertia(fn ($page) => $page
            ->where('lanes.0.off', 'holiday')
            ->where('stats.mechanics.working', 0)
            ->where('stats.mechanics.off.0.reason', 'holiday')
            ->where('shell.roster.0.status', 'holiday'));
    }

    public function test_placeholder_pages_render_for_later_phases(): void
    {
        foreach (['calendar', 'jobs', 'invoices'] as $page) {
            $this->get("/$page")->assertOk()->assertInertia(fn ($p) => $p->component('placeholder')->where('page', $page));
        }
    }
}
