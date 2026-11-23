<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class OwnerSeeder extends Seeder
{
    public function run(): void
    {
        $email = config('workshop.owner.email');
        if (User::where('email', $email)->exists()) {
            return;
        }

        $password = config('workshop.owner.password') ?: Str::password(16, symbols: false);
        User::create([
            'name' => config('workshop.owner.name'),
            'email' => $email,
            'password' => $password,
            'email_verified_at' => now(),
        ]);

        if (! config('workshop.owner.password')) {
            $this->command?->warn("Owner login created: {$email} / {$password}  (shown once, change it in Settings)");
        }
    }
}
