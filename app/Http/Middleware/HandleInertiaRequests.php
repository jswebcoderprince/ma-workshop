<?php

namespace App\Http\Middleware;

use App\Models\WorkOrder;
use App\Support\Settings;
use App\Support\Translations;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return array_merge(parent::share($request), [
            'auth' => ['user' => $user?->only('id', 'name', 'email')],
            'locale' => app()->getLocale(),
            'translations' => fn () => Translations::for(app()->getLocale()),
            'workshop' => fn () => [
                'name' => Settings::get('company')['name'] ?? 'MA Engine Lab',
                'accent' => Settings::get('accent', 'violet'),
                'timezone' => config('workshop.timezone'),
            ],
            // Small numbers shown in the shell (sidebar, inbox icon). Only for logged-in pages.
            'counts' => fn () => $user ? [
                'openJobs' => WorkOrder::where('status', '!=', 'completed')->count(),
                'toCall' => WorkOrder::whereNotNull('notify_customer')->count(),
            ] : null,
            'flash' => ['status' => fn () => $request->session()->get('status')],
        ]);
    }
}
