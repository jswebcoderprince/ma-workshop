<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Closure;
use App\Models\Customer;
use App\Models\Mechanic;
use App\Models\TimeOff;
use App\Models\User;
use App\Models\WorkOrder;
use App\Support\Settings;
use App\Support\Workshop;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Tests\TestCase;

class MechanicsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Date::setTestNow(Date::parse('2026-11-23 08:00:00', 'UTC')); // Monday 10:00 in Vilnius
        $this->actingAs(User::factory()->create());
    }

    private function mechanic(array $attrs = []): Mechanic
    {
        return Mechanic::create($attrs + ['name' => 'Tomas', 'vehicle_types' => ['car'], 'work_days' => [1, 2, 3, 4, 5, 6]]);
    }

    private function job(Mechanic $m, string $date, int $q, int $dur): WorkOrder
    {
        $c = Customer::firstOrCreate(['name' => 'Jonas']);

        return WorkOrder::create(['customer_id' => $c->id, 'mechanic_id' => $m->id, 'description' => 'Diagnostika', 'start_date' => $date, 'start_quarter' => $q, 'duration_quarters' => $dur]);
    }

    public function test_page_lists_mechanics_with_load_time_off_and_closures(): void
    {
        $m = $this->mechanic();
        $this->job($m, '2026-11-24', 0, 4);
        TimeOff::create(['mechanic_id' => $m->id, 'type' => 'holiday', 'starts_on' => '2026-12-07', 'ends_on' => '2026-12-11']);
        TimeOff::create(['mechanic_id' => $m->id, 'type' => 'day_off', 'starts_on' => '2026-11-02', 'ends_on' => '2026-11-02']); // past: hidden
        Closure::create(['date' => '2026-12-24', 'name' => 'Kūčios']);
        Closure::create(['date' => '2026-01-01', 'name' => 'Naujieji metai']); // past: hidden

        $this->get('/mechanics')->assertOk()->assertInertia(fn ($page) => $page
            ->component('mechanics/index')
            ->has('mechanics', 1, fn ($row) => $row
                ->where('name', 'Tomas')
                ->where('openJobs', 1)
                ->where('canDelete', false)
                // From 10:30 Monday only 3 quarters are free before Tuesday's job, so a 1-day slot starts Wednesday.
                ->where('nextFree', '2026-11-25')
                ->has('timeOff', 1)
                ->where('timeOff.0.from', '2026-12-07')
                ->etc())
            ->has('closures', 1)
            ->where('closures.0.name', 'Kūčios'));
    }

    public function test_create_and_update_a_mechanic(): void
    {
        $this->post('/mechanics', ['name' => 'Mantas', 'vehicle_types' => ['car', 'moto'], 'work_days' => [5, 1, 2]])->assertSessionHasNoErrors();

        $m = Mechanic::firstWhere('name', 'Mantas');
        $this->assertSame([1, 2, 5], $m->work_days);
        $this->assertMatchesRegularExpression('/^#[0-9a-f]{6}$/', $m->color, 'gets a palette colour');
        $this->assertTrue($m->active);

        $this->patch("/mechanics/{$m->id}", ['name' => 'Mantas K.', 'vehicle_types' => ['water'], 'work_days' => [1], 'color' => '#22b07d', 'active' => false])
            ->assertSessionHasNoErrors();
        $m->refresh();
        $this->assertSame(['Mantas K.', ['water'], false], [$m->name, $m->vehicle_types, $m->active]);
        $this->assertSame(2, ActivityLog::where('subject_id', $m->id)->count());
    }

    public function test_mechanic_validation(): void
    {
        $this->post('/mechanics', ['name' => '', 'vehicle_types' => ['truck'], 'work_days' => [0, 8], 'color' => 'red'])
            ->assertSessionHasErrors(['name', 'vehicle_types.0', 'work_days.0', 'work_days.1', 'color']);
        $this->post('/mechanics', ['name' => 'X', 'vehicle_types' => [], 'work_days' => []])->assertSessionHasErrors(['vehicle_types', 'work_days']);
    }

    public function test_mechanics_with_jobs_are_kept(): void
    {
        $busy = $this->mechanic();
        $this->job($busy, '2026-11-24', 0, 1);
        $idle = $this->mechanic(['name' => 'Idle']);

        $this->delete("/mechanics/{$busy->id}")->assertSessionHasErrors('mechanic');
        $this->assertModelExists($busy);
        $this->delete("/mechanics/{$idle->id}")->assertSessionHasNoErrors();
        $this->assertModelMissing($idle);
    }

    public function test_time_off_is_added_and_warns_about_jobs_without_moving_them(): void
    {
        $m = $this->mechanic();
        $job = $this->job($m, '2026-11-25', 0, 8); // Wed–Thu

        $this->post("/mechanics/{$m->id}/time-off", ['type' => 'holiday', 'starts_on' => '2026-11-26', 'ends_on' => '2026-11-27'])
            ->assertSessionHasNoErrors()
            ->assertSessionHas('warning', '1 job falls in this time off. Check the calendar and move it if needed.');

        $job->refresh();
        $this->assertSame(['2026-11-25', 0, 8], [$job->start_date->format('Y-m-d'), $job->start_quarter, $job->duration_quarters], 'nothing moved');
        $this->assertSame('mechanic_off', (new Workshop)->schedule()->warning($job->id));
    }

    public function test_time_off_without_jobs_has_no_warning(): void
    {
        $m = $this->mechanic();
        $this->post("/mechanics/{$m->id}/time-off", ['type' => 'sick', 'starts_on' => '2026-12-01', 'ends_on' => '2026-12-01'])
            ->assertSessionHas('status', 'saved')
            ->assertSessionMissing('warning');
    }

    public function test_time_off_validation_and_overlap(): void
    {
        $m = $this->mechanic();
        $this->post("/mechanics/{$m->id}/time-off", ['type' => 'party', 'starts_on' => '2026-12-05', 'ends_on' => '2026-12-01'])
            ->assertSessionHasErrors(['type', 'ends_on']);

        $this->post("/mechanics/{$m->id}/time-off", ['type' => 'holiday', 'starts_on' => '2026-12-07', 'ends_on' => '2026-12-11']);
        $this->post("/mechanics/{$m->id}/time-off", ['type' => 'day_off', 'starts_on' => '2026-12-11', 'ends_on' => '2026-12-14'])
            ->assertSessionHasErrors('starts_on');
        $this->assertSame(1, $m->timeOff()->count());

        $id = $m->timeOff()->first()->id;
        $this->delete("/time-off/{$id}")->assertSessionHasNoErrors();
        $this->assertSame(0, $m->timeOff()->count());
    }

    public function test_warning_follows_the_language(): void
    {
        Settings::set('locale', 'lt');
        $m = $this->mechanic();
        $this->job($m, '2026-11-25', 0, 4);
        $this->job($m, '2026-11-26', 0, 4);
        $this->post("/mechanics/{$m->id}/time-off", ['type' => 'holiday', 'starts_on' => '2026-11-25', 'ends_on' => '2026-11-26'])
            ->assertSessionHas('warning', '2 darbai patenka į šį neatvykimą. Patikrinkite kalendorių ir, jei reikia, juos perkelkite.');
    }

    public function test_closures_are_added_once_and_warn_about_jobs_on_that_day(): void
    {
        $m = $this->mechanic();
        $this->job($m, '2026-12-23', 2, 4); // Wed afternoon → Thu morning

        $this->post('/closures', ['date' => '2026-12-24', 'name' => 'Kūčios'])
            ->assertSessionHasNoErrors()
            ->assertSessionHas('warning', '1 job was planned on this day. It now continues on the next open day.');
        $this->post('/closures', ['date' => '2026-12-24', 'name' => 'Again'])->assertSessionHasErrors('date');

        $closure = Closure::firstWhere('date', '2026-12-24');
        $this->delete("/closures/{$closure->id}")->assertSessionHasNoErrors();
        $this->assertSame(0, Closure::count());
    }
}
