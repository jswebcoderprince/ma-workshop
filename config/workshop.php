<?php

return [

    // Dates, "now" and quarter boundaries use the workshop's local time.
    'timezone' => env('WORKSHOP_TIMEZONE', 'Europe/Vilnius'),

    // Used by `db:seed`: the owner's login. Without OWNER_PASSWORD a random one is printed once.
    'owner' => [
        'name' => env('OWNER_NAME', 'Owner'),
        'email' => env('OWNER_EMAIL', 'admin@workshop.test'),
        'password' => env('OWNER_PASSWORD'),
    ],

    // Fictional mechanics, customers and jobs for development and demos.
    'seed_demo' => (bool) env('SEED_DEMO', false),

    // Settings the owner can change in the app. Stored values in the `settings` table win.
    'defaults' => [
        'locale' => 'en',
        'accent' => 'violet',
        'company' => [
            'name' => 'MA Engine Lab',
            'code' => '',
            'vat_code' => '',
            'address' => 'Prienai, Lietuva',
            'bank' => '',
            'phone' => '',
            'email' => '',
        ],
        'vat_payer' => true,
        'vat_rate' => 21,
        'invoice_series' => 'MAE',
        'invoice_next_number' => 1,
        'hourly_rate_cents' => 4000,
        'payment_days' => 14,
        // ISO weekday => opening time and number of 2.5-hour quarters
        'hours' => [
            1 => ['open' => '08:00', 'quarters' => 4],
            2 => ['open' => '08:00', 'quarters' => 4],
            3 => ['open' => '08:00', 'quarters' => 4],
            4 => ['open' => '08:00', 'quarters' => 4],
            5 => ['open' => '08:00', 'quarters' => 4],
            6 => ['open' => '09:00', 'quarters' => 2],
            7 => ['open' => '00:00', 'quarters' => 0],
        ],
    ],

];
