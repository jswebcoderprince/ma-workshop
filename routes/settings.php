<?php

use App\Http\Controllers\Settings\AccountController;
use App\Http\Controllers\Settings\WorkshopSettingsController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->prefix('settings')->name('settings.')->group(function () {
    Route::redirect('/', '/settings/general')->name('index');

    Route::get('general', [WorkshopSettingsController::class, 'general'])->name('general');
    Route::patch('general', [WorkshopSettingsController::class, 'updateGeneral']);

    Route::get('company', [WorkshopSettingsController::class, 'company'])->name('company');
    Route::patch('company', [WorkshopSettingsController::class, 'updateCompany']);

    Route::get('invoices', [WorkshopSettingsController::class, 'invoices'])->name('invoices');
    Route::patch('invoices', [WorkshopSettingsController::class, 'updateInvoices']);

    Route::get('hours', [WorkshopSettingsController::class, 'hours'])->name('hours');
    Route::patch('hours', [WorkshopSettingsController::class, 'updateHours']);

    Route::get('account', [AccountController::class, 'edit'])->name('account');
    Route::patch('account', [AccountController::class, 'updateProfile']);
    Route::put('password', [AccountController::class, 'updatePassword'])->name('password');
});
