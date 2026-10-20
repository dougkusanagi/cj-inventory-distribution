<?php

use App\Enums\UserRole;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Support\Facades\Hash;

test('database seeding can be repeated without duplicating the default user', function () {
    $this->seed(DatabaseSeeder::class);
    $this->seed(DatabaseSeeder::class);

    expect(User::query()->where('email', 'test@example.com')->count())->toBe(1);

    $testUser = User::query()->where('email', 'test@example.com')->sole();

    expect($testUser->isStaff())->toBeTrue()
        ->and(User::query()->pluck('role', 'email')->all())->toMatchArray([
            'test@example.com' => UserRole::Admin,
            'estoque@example.com' => UserRole::Stock,
            'marketing@example.com' => UserRole::Marketing,
        ]);
});

test('seeding never overwrites an existing demo account password or role', function () {
    $user = User::factory()->marketing()->create(['email' => 'test@example.com', 'password' => 'changed-password']);

    $this->seed(DatabaseSeeder::class);

    expect(Hash::check('changed-password', $user->fresh()->password))->toBeTrue()
        ->and($user->fresh()->role)->toBe(UserRole::Marketing);
});

test('production seeding cannot create demo users or stock', function () {
    $this->app->detectEnvironment(fn (): string => 'production');

    $this->artisan('db:seed', ['--class' => DatabaseSeeder::class, '--force' => true])->assertSuccessful();

    $this->assertDatabaseEmpty('users');
    $this->assertDatabaseEmpty('products');
});
