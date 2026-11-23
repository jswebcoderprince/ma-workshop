<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Mechanic;
use App\Models\User;
use App\Models\WorkOrder;
use App\Support\Settings;
use App\Support\Workshop;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->actingAs($this->user);
    }

    public function test_every_settings_page_renders(): void
    {
        $this->get('/settings')->assertRedirect('/settings/general');
        foreach (['general', 'company', 'invoices', 'hours', 'account'] as $tab) {
            $this->get("/settings/$tab")->assertOk()->assertInertia(fn ($page) => $page->component("settings/$tab"));
        }
    }

    public function test_language_switch_changes_the_whole_app(): void
    {
        $this->patch('/settings/general', ['locale' => 'lt', 'accent' => 'teal'])->assertSessionHas('status', 'saved');

        $this->assertSame('lt', Settings::locale());
        $this->get('/settings/general')
            ->assertSee('lang="lt"', false)
            ->assertSee('data-accent="teal"', false)
            ->assertInertia(fn ($page) => $page->where('locale', 'lt')->where('translations.Calendar', 'Kalendorius'));

        $this->patch('/settings/general', ['locale' => 'en', 'accent' => 'cobalt']);
        $this->get('/settings/general')->assertInertia(fn ($page) => $page->where('locale', 'en')->where('translations', []));
    }

    public function test_general_settings_reject_unknown_values(): void
    {
        $this->patch('/settings/general', ['locale' => 'de', 'accent' => 'pink'])->assertSessionHasErrors(['locale', 'accent']);
        $this->assertSame('en', Settings::locale());
    }

    public function test_validation_messages_follow_the_language(): void
    {
        Settings::set('locale', 'lt');
        $this->patch('/settings/company', ['name' => ''])->assertSessionHasErrors(['name' => 'Laukas „pavadinimas“ yra privalomas.']);
    }

    public function test_company_details_are_saved(): void
    {
        $this->patch('/settings/company', [
            'name' => 'MA Engine Lab, MB', 'code' => '305000000', 'vat_code' => 'LT100000000000',
            'address' => 'Prienai', 'bank' => 'LT12 3456 7890 1234 5678', 'phone' => '+370 600 00000', 'email' => 'info@example.lt',
        ])->assertSessionHasNoErrors();

        $this->assertSame('MA Engine Lab, MB', Settings::get('company')['name']);
        $this->get('/')->assertInertia(fn ($page) => $page->where('workshop.name', 'MA Engine Lab, MB'));
        $this->patch('/settings/company', ['name' => 'X', 'email' => 'not-an-email'])->assertSessionHasErrors('email');
    }

    public function test_invoice_settings_are_saved_and_series_is_uppercased(): void
    {
        $this->patch('/settings/invoices', [
            'vat_payer' => false, 'vat_rate' => 21, 'invoice_series' => 'mae', 'invoice_next_number' => 5, 'hourly_rate' => 42.5, 'payment_days' => 10,
        ])->assertSessionHasNoErrors();

        $this->assertSame('MAE', Settings::get('invoice_series'));
        $this->assertSame(4250, Settings::get('hourly_rate_cents'));
        $this->assertFalse(Settings::get('vat_payer'));
        $this->patch('/settings/invoices', ['vat_payer' => true, 'vat_rate' => 21, 'invoice_series' => 'MA-E', 'invoice_next_number' => 1, 'hourly_rate' => 1, 'payment_days' => 1])
            ->assertSessionHasErrors('invoice_series');
    }

    public function test_invoice_numbers_cannot_go_back_below_an_issued_one(): void
    {
        $m = Mechanic::create(['name' => 'T', 'vehicle_types' => ['car'], 'work_days' => [1]]);
        $c = Customer::create(['name' => 'C']);
        $w = WorkOrder::create(['customer_id' => $c->id, 'mechanic_id' => $m->id, 'description' => 'x', 'start_date' => '2026-11-23', 'start_quarter' => 0, 'duration_quarters' => 1]);
        Invoice::create(['work_order_id' => $w->id, 'series' => 'MAE', 'number' => 7, 'issued_on' => '2026-11-23', 'due_on' => '2026-12-07', 'seller' => [], 'buyer' => [], 'vat_payer' => true, 'vat_rate' => 21, 'subtotal_cents' => 0, 'vat_cents' => 0, 'total_cents' => 0]);

        $payload = ['vat_payer' => true, 'vat_rate' => 21, 'invoice_series' => 'MAE', 'hourly_rate' => 40, 'payment_days' => 14];
        $this->patch('/settings/invoices', $payload + ['invoice_next_number' => 7])->assertSessionHasErrors('invoice_next_number');
        $this->patch('/settings/invoices', $payload + ['invoice_next_number' => 8])->assertSessionHasNoErrors();
        // A different series starts its own numbering.
        $this->patch('/settings/invoices', ['invoice_series' => 'MAX', 'invoice_next_number' => 1] + $payload)->assertSessionHasNoErrors();
    }

    public function test_working_hours_change_the_calendar(): void
    {
        $hours = config('workshop.defaults.hours');
        $hours[6] = ['open' => '09:00', 'quarters' => 0];
        $hours[1] = ['open' => '07:30', 'quarters' => 4];

        $this->patch('/settings/hours', ['hours' => $hours])->assertSessionHasNoErrors();

        $cal = (new Workshop)->calendar();
        $this->assertSame(0, $cal->quartersOn('2026-11-28'));
        $this->assertSame('07:30', $cal->quarterStart('2026-11-23', 0));
        $this->assertSame('17:30', $cal->quarterEnd('2026-11-23', 3));
    }

    public function test_working_hours_must_fit_in_the_day_and_not_all_be_closed(): void
    {
        $hours = config('workshop.defaults.hours');
        $late = $hours;
        $late[2] = ['open' => '20:00', 'quarters' => 4];
        $this->patch('/settings/hours', ['hours' => $late])->assertSessionHasErrors('hours.2.quarters');

        $closed = array_map(fn ($d) => ['open' => '08:00', 'quarters' => 0], $hours);
        $this->patch('/settings/hours', ['hours' => $closed])->assertSessionHasErrors('hours.1.quarters');

        $bad = $hours;
        $bad[3] = ['open' => '8am', 'quarters' => 5];
        $this->patch('/settings/hours', ['hours' => $bad])->assertSessionHasErrors(['hours.3.open', 'hours.3.quarters']);
    }

    public function test_owner_can_change_name_email_and_password(): void
    {
        $this->patch('/settings/account', ['name' => 'Ash', 'email' => 'ash@example.lt'])->assertSessionHasNoErrors();
        $this->assertSame('ash@example.lt', $this->user->fresh()->email);

        $this->put('/settings/password', ['current_password' => 'wrong', 'password' => 'new-password-1', 'password_confirmation' => 'new-password-1'])
            ->assertSessionHasErrors('current_password');
        $this->put('/settings/password', ['current_password' => 'password', 'password' => 'new-password-1', 'password_confirmation' => 'new-password-1'])
            ->assertSessionHasNoErrors();
        $this->assertTrue(Hash::check('new-password-1', $this->user->fresh()->password));
    }
}
