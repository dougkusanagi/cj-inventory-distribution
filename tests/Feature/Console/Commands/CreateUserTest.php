<?php

use App\Enums\UserRole;
use App\Models\User;

it('creates a user through interactive prompts', function () {
    $this->artisan('user:create')
        ->expectsQuestion('Nome completo', 'Ana Souza')
        ->expectsQuestion('E-mail', 'ANA@EXAMPLE.COM')
        ->expectsQuestion('Senha', 'password')
        ->expectsQuestion('Confirme a senha', 'password')
        ->expectsQuestion('Perfil de acesso', 'marketing')
        ->assertSuccessful();

    $user = User::query()->sole();

    expect($user->name)->toBe('Ana Souza')
        ->and($user->email)->toBe('ana@example.com')
        ->and($user->role)->toBe(UserRole::Marketing)
        ->and(password_verify('password', $user->password))->toBeTrue();
});

it('assigns sectors when creating a production user', function () {
    $this->artisan('user:create')
        ->expectsQuestion('Nome completo', 'Pessoa da costura')
        ->expectsQuestion('E-mail', 'costura@example.com')
        ->expectsQuestion('Senha', 'password')
        ->expectsQuestion('Confirme a senha', 'password')
        ->expectsQuestion('Perfil de acesso', 'production')
        ->expectsQuestion('Setores responsáveis', ['sewing', 'washing'])
        ->assertSuccessful();

    $user = User::query()->sole();
    expect($user->role)->toBe(UserRole::Production)
        ->and($user->productionStages()->orderBy('stage')->pluck('stage')->all())->toBe(['sewing', 'washing']);
});
