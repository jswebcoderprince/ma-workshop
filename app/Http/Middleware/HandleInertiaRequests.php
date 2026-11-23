<?php

namespace App\Http\Middleware;

use App\Support\Settings;
use App\Support\ShellData;
use App\Support\Translations;
use App\Support\Workshop;
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
                'accent' => Settings::accent(),
                'timezone' => config('workshop.timezone'),
            ],
            // The app frame: today's hours, mechanics' status today, counters. Only for logged-in pages.
            'shell' => fn () => $user ? ShellData::for(app(Workshop::class)) : null,
            'flash' => [
                'status' => fn () => $request->session()->get('status'),
                'warning' => fn () => $request->session()->get('warning'),
            ],
        ]);
    }
}
