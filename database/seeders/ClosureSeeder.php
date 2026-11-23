<?php

namespace Database\Seeders;

use App\Models\Closure;
use Illuminate\Database\Seeder;

/**
 * Lithuanian public holidays that fall on working days (Mon–Sat). Sundays are closed anyway.
 * The owner can add or remove days in the app.
 */
class ClosureSeeder extends Seeder
{
    public const DAYS = [
        '2026-12-24' => 'Kūčios',
        '2026-12-25' => 'Kalėdos',
        '2026-12-26' => 'Antroji Kalėdų diena',
        '2027-01-01' => 'Naujieji metai',
        '2027-02-16' => 'Lietuvos valstybės atkūrimo diena',
        '2027-03-11' => 'Lietuvos nepriklausomybės atkūrimo diena',
        '2027-03-29' => 'Antroji Velykų diena',
        '2027-05-01' => 'Tarptautinė darbo diena',
        '2027-06-24' => 'Rasos ir Joninių diena',
        '2027-07-06' => 'Valstybės diena',
        '2027-08-15' => 'Žolinė',
        '2027-11-01' => 'Visų šventųjų diena',
        '2027-11-02' => 'Vėlinės',
        '2027-12-24' => 'Kūčios',
        '2027-12-25' => 'Kalėdos',
        '2027-12-26' => 'Antroji Kalėdų diena',
    ];

    public function run(): void
    {
        foreach (self::DAYS as $date => $name) {
            Closure::firstOrCreate(['date' => $date], ['name' => $name]);
        }
    }
}
