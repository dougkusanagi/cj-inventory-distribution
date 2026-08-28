<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $testUser = User::query()->firstOrNew([
            'email' => 'test@example.com',
        ]);

        $testUser->fill([
            'name' => 'Test User',
            'password' => 'password',
        ]);
        $testUser->forceFill(['email_verified_at' => now()]);
        $testUser->save();
    }
}
