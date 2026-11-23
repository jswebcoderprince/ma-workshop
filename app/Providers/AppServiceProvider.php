<?php

namespace App\Providers;

use App\Support\Workshop;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // One calendar/availability snapshot per request.
        $this->app->scoped(Workshop::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
