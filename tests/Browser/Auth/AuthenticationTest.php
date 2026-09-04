<?php

use App\Models\User;
use Illuminate\Support\Facades\Vite;

beforeEach(function (): void {
    config(['inertia.ssr.enabled' => false]);
    Vite::useHotFile(storage_path('framework/testing-hot-file'));
});

it('keeps an invalid login on the login screen with feedback', function () {
    $user = User::factory()->create();

    $page = visit(route('login', [], false))
        ->wait(1)
        ->type('#email', $user->email)
        ->type('#password', 'wrong-password');

    $page
        ->submit()
        ->wait(1)
        ->assertRoute('login')
        ->assertSee('As credenciais informadas não correspondem aos nossos registros.')
        ->assertNoJavaScriptErrors();
});

it('logs in and logs out through the authenticated navigation', function () {
    $user = User::factory()->create();

    $page = visit(route('login', [], false))
        ->wait(1)
        ->type('#email', $user->email)
        ->type('#password', 'password');

    $page
        ->submit()
        ->wait(1)
        ->assertRoute('dashboard')
        ->assertSee('O que está acontecendo no estoque?')
        ->assertPresent('@sidebar-menu-button')
        ->assertNoJavaScriptErrors();

    $page
        ->click('@sidebar-menu-button')
        ->assertPresent('@logout-button')
        ->click('@logout-button')
        ->wait(1)
        ->assertRoute('home')
        ->assertSee('Log in')
        ->assertNoJavaScriptErrors();
});
