<?php

use App\Models\User;

it('creates a user through interactive prompts', function () {
    $this->artisan('user:create')
        ->expectsQuestion('Nome completo', 'Ana Souza')
        ->expectsQuestion('E-mail', 'ANA@EXAMPLE.COM')
        ->expectsQuestion('Senha', 'password')
        ->expectsQuestion('Confirme a senha', 'password')
        ->assertSuccessful();

    $user = User::query()->sole();

    expect($user->name)->toBe('Ana Souza')
        ->and($user->email)->toBe('ana@example.com')
        ->and(password_verify('password', $user->password))->toBeTrue();
});
