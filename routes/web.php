<?php

use App\Http\Controllers\CalendarController;
use App\Http\Controllers\ClosureController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\MechanicController;
use App\Http\Controllers\OverviewController;
use App\Http\Controllers\TimeOffController;
use App\Http\Controllers\VehicleController;
use App\Http\Controllers\WorkOrderController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::get('/', OverviewController::class)->name('overview');

    Route::get('mechanics', [MechanicController::class, 'index'])->name('mechanics');
    Route::post('mechanics', [MechanicController::class, 'store'])->name('mechanics.store');
    Route::patch('mechanics/{mechanic}', [MechanicController::class, 'update'])->name('mechanics.update');
    Route::delete('mechanics/{mechanic}', [MechanicController::class, 'destroy'])->name('mechanics.destroy');
    Route::post('mechanics/{mechanic}/time-off', [TimeOffController::class, 'store'])->name('time-off.store');
    Route::delete('time-off/{timeOff}', [TimeOffController::class, 'destroy'])->name('time-off.destroy');
    Route::post('closures', [ClosureController::class, 'store'])->name('closures.store');
    Route::delete('closures/{closure}', [ClosureController::class, 'destroy'])->name('closures.destroy');

    Route::get('customers', [CustomerController::class, 'index'])->name('customers');
    Route::get('customers/search', [CustomerController::class, 'search'])->name('customers.search');
    Route::post('customers', [CustomerController::class, 'store'])->name('customers.store');
    Route::patch('customers/{customer}', [CustomerController::class, 'update'])->name('customers.update');
    Route::delete('customers/{customer}', [CustomerController::class, 'destroy'])->name('customers.destroy');
    Route::post('customers/{customer}/vehicles', [VehicleController::class, 'store'])->name('vehicles.store');
    Route::patch('vehicles/{vehicle}', [VehicleController::class, 'update'])->name('vehicles.update');
    Route::delete('vehicles/{vehicle}', [VehicleController::class, 'destroy'])->name('vehicles.destroy');

    Route::get('calendar', [CalendarController::class, 'index'])->name('calendar');
    Route::get('calendar/slots', [CalendarController::class, 'slots'])->name('calendar.slots');
    Route::get('calendar/check', [CalendarController::class, 'check'])->name('calendar.check');

    Route::post('jobs', [WorkOrderController::class, 'store'])->name('jobs.store');
    Route::patch('jobs/{workOrder}', [WorkOrderController::class, 'update'])->name('jobs.update');
    Route::delete('jobs/{workOrder}', [WorkOrderController::class, 'destroy'])->name('jobs.destroy');
    Route::post('jobs/{workOrder}/duration', [WorkOrderController::class, 'duration'])->name('jobs.duration');
    Route::post('jobs/{workOrder}/status', [WorkOrderController::class, 'status'])->name('jobs.status');
    Route::post('jobs/{workOrder}/informed', [WorkOrderController::class, 'informed'])->name('jobs.informed');
    Route::post('jobs/{workOrder}/move', [WorkOrderController::class, 'move'])->name('jobs.move');

    // Built in later phases (docs/ROADMAP.md); for now they show a placeholder so navigation works.
    foreach (['jobs', 'invoices'] as $page) {
        Route::get($page, fn () => Inertia::render('placeholder', ['page' => $page]))->name($page);
    }
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
