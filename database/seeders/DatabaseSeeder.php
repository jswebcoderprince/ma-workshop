<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Owner login and public holidays always; fictional demo data only when SEED_DEMO=true.
     */
    public function run(): void
    {
        $this->call([OwnerSeeder::class, ClosureSeeder::class]);

        if (config('workshop.seed_demo')) {
            $this->call(DemoSeeder::class);
        }
    }
}
