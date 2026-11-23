<?php

use App\Http\Controllers\OverviewController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::get('/', OverviewController::class)->name('overview');

    // Built in later phases (docs/ROADMAP.md); for now they show a placeholder so navigation works.
    foreach (['calendar', 'jobs', 'customers', 'mechanics', 'invoices'] as $page) {
        Route::get($page, fn () => Inertia::render('placeholder', ['page' => $page]))->name($page);
    }
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
