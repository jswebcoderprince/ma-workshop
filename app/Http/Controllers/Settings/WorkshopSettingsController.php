<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Invoice;
use App\Scheduling\WorkCalendar;
use App\Support\Settings;
use App\Support\Workshop;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Settings the owner changes in the app. Stored in the `settings` table via App\Support\Settings. */
class WorkshopSettingsController extends Controller
{
    public function general(): Response
    {
        return Inertia::render('settings/general', [
            'values' => ['locale' => Settings::locale(), 'accent' => Settings::get('accent', 'violet')],
        ]);
    }

    public function updateGeneral(Request $request): RedirectResponse
    {
        $values = $request->validate([
            'locale' => ['required', Rule::in(['en', 'lt'])],
            'accent' => ['required', Rule::in(['violet', 'teal'])],
        ]);

        return $this->save('settings.general', $values);
    }

    public function company(): Response
    {
        return Inertia::render('settings/company', ['values' => Settings::get('company')]);
    }

    public function updateCompany(Request $request): RedirectResponse
    {
        $values = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'code' => ['nullable', 'string', 'max:20'],
            'vat_code' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:200'],
            'bank' => ['nullable', 'string', 'max:40'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:120'],
        ]);

        return $this->save('settings.company', ['company' => array_map(fn ($v) => $v ?? '', $values)]);
    }

    public function invoices(): Response
    {
        $series = (string) Settings::get('invoice_series');

        return Inertia::render('settings/invoices', [
            'values' => [
                'vat_payer' => (bool) Settings::get('vat_payer'),
                'vat_rate' => (float) Settings::get('vat_rate'),
                'invoice_series' => $series,
                'invoice_next_number' => (int) Settings::get('invoice_next_number'),
                'hourly_rate' => round(((int) Settings::get('hourly_rate_cents')) / 100, 2),
                'payment_days' => (int) Settings::get('payment_days'),
            ],
            'minNextNumber' => $this->minNextNumber($series),
        ]);
    }

    public function updateInvoices(Request $request): RedirectResponse
    {
        $request->merge(['invoice_series' => strtoupper(trim((string) $request->input('invoice_series')))]);
        $v = $request->validate([
            'vat_payer' => ['required', 'boolean'],
            'vat_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'invoice_series' => ['required', 'string', 'max:10', 'regex:/^[A-Z0-9]+$/'],
            'invoice_next_number' => ['required', 'integer', 'min:1', 'max:9999999'],
            'hourly_rate' => ['required', 'numeric', 'min:0', 'max:10000'],
            'payment_days' => ['required', 'integer', 'min:0', 'max:365'],
        ]);

        // Never let the next number go back to one that was already used in this series.
        $min = $this->minNextNumber($v['invoice_series']);
        if ($v['invoice_next_number'] < $min) {
            return back()->withErrors(['invoice_next_number' => __('Must be at least :min (numbers are never reused).', ['min' => $min])]);
        }

        return $this->save('settings.invoices', [
            'vat_payer' => (bool) $v['vat_payer'],
            'vat_rate' => (float) $v['vat_rate'],
            'invoice_series' => $v['invoice_series'],
            'invoice_next_number' => (int) $v['invoice_next_number'],
            'hourly_rate_cents' => (int) round($v['hourly_rate'] * 100),
            'payment_days' => (int) $v['payment_days'],
        ]);
    }

    public function hours(): Response
    {
        return Inertia::render('settings/hours', ['values' => Workshop::hours()]);
    }

    public function updateHours(Request $request): RedirectResponse
    {
        $rules = [];
        foreach (range(1, 7) as $day) {
            $rules["hours.$day.open"] = ['required', 'date_format:H:i'];
            $rules["hours.$day.quarters"] = ['required', 'integer', 'min:0', 'max:4'];
        }
        $v = $request->validate($rules);

        $hours = [];
        foreach (range(1, 7) as $day) {
            [$h, $m] = array_map('intval', explode(':', $v['hours'][$day]['open']));
            $quarters = (int) $v['hours'][$day]['quarters'];
            if ($h * 60 + $m + $quarters * WorkCalendar::QUARTER_MINUTES > 24 * 60) {
                return back()->withErrors(["hours.$day.quarters" => __('The working day must end by midnight.')]);
            }
            $hours[$day] = ['open' => $v['hours'][$day]['open'], 'quarters' => $quarters];
        }
        if (array_sum(array_column($hours, 'quarters')) === 0) {
            return back()->withErrors(['hours.1.quarters' => __('At least one day must be open.')]);
        }

        return $this->save('settings.hours', ['hours' => $hours]);
    }

    /** @param  array<string, mixed>  $values */
    private function save(string $action, array $values): RedirectResponse
    {
        Settings::setMany($values);
        ActivityLog::record($action, null, $values);

        return back()->with('status', 'saved');
    }

    private function minNextNumber(string $series): int
    {
        return (int) Invoice::where('series', $series)->max('number') + 1;
    }
}
