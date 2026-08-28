<?php

use App\Models\User;
use Database\Seeders\DatabaseSeeder;

test('database seeding can be repeated without duplicating the default user', function () {
    $this->seed(DatabaseSeeder::class);
    $this->seed(DatabaseSeeder::class);

    expect(User::query()->where('email', 'test@example.com')->count())->toBe(1);
});
