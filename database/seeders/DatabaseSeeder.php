<?php

namespace Database\Seeders;

use App\Enums\UserRole;
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
        if (! app()->environment(['local', 'testing'])) {
            return;
        }

        foreach ([
            'test@example.com' => ['Test User', UserRole::Admin],
            'estoque@example.com' => ['Usuário do Estoque', UserRole::Stock],
            'marketing@example.com' => ['Usuário do Marketing', UserRole::Marketing],
        ] as $email => [$name, $role]) {
            $user = User::query()->firstOrNew(['email' => $email]);
            if ($user->exists) {
                continue;
            }

            $user->fill(['name' => $name, 'password' => 'password']);
            $user->forceFill(['email_verified_at' => now(), 'role' => $role]);
            $user->save();
        }

        $this->call(CatalogDemoSeeder::class);
        $this->call(OperationalDemoSeeder::class);
        $this->call(FullSizeCatalogDemoSeeder::class);
        $this->call(EdgeCaseCatalogDemoSeeder::class);
    }
}
