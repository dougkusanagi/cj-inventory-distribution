<?php

use App\Enums\UserRole;
use App\Models\User;
use App\Notifications\UserAccessLink;
use Illuminate\Support\Facades\Notification;

test('an administrator creates an account from the responsive user drawer', function (int $width, int $height) {
    $admin = User::factory()->create();
    $this->actingAs($admin);
    Notification::fake();

    visit(route('users.index', [], false))->resize($width, $height)
        ->press('Novo usuário')
        ->assertVisible('[data-testid="user-account-drawer"]')
        ->fill('#account-name', 'Nova pessoa do Marketing')
        ->fill('#account-email', 'marketing-real@example.com')
        ->click('[data-testid="user-account-drawer"] label:has-text("Marketing")')
        ->screenshot(filename: "user-management-drawer-{$width}")
        ->press('Criar e enviar link')
        ->assertMissing('[data-testid="user-account-drawer"]')
        ->assertSee('Nova pessoa do Marketing')
        ->assertSee('marketing-real@example.com')
        ->assertSee('Aguardando confirmação do e-mail')
        ->screenshot(filename: "user-management-list-{$width}")
        ->assertScript('document.documentElement.scrollWidth <= window.innerWidth')
        ->assertNoJavaScriptErrors();

    $user = User::where('email', 'marketing-real@example.com')->sole();
    expect($user->role)->toBe(UserRole::Marketing)->and($user->is_active)->toBeTrue();
    Notification::assertSentTo($user, UserAccessLink::class);
})->with(['desktop' => [1280, 900], 'mobile' => [390, 844]]);

test('an administrator edits roles and confirms deactivation from the account menu', function () {
    $admin = User::factory()->create();
    $user = User::factory()->stock()->create(['name' => 'Pessoa da equipe']);
    $this->actingAs($admin);

    visit(route('users.index', [], false))
        ->click('button[aria-label="Editar Pessoa da equipe"]')
        ->click('[data-testid="user-account-drawer"] label:has-text("Marketing")')
        ->press('Salvar alterações')
        ->assertMissing('[data-testid="user-account-drawer"]')
        ->assertSee('Conta atualizada.')
        ->click('button[aria-label="Ações de Pessoa da equipe"]')
        ->click('[role="menuitem"]:has-text("Desativar acesso")')
        ->assertSee('Desativar o acesso de Pessoa da equipe?')
        ->click('[role="dialog"] button:has-text("Desativar acesso")')
        ->assertSee('Desativado')
        ->assertDisabled('button[aria-label="Enviar link para Pessoa da equipe"]')
        ->assertNoJavaScriptErrors();

    expect($user->fresh()->role)->toBe(UserRole::Marketing)->and($user->fresh()->is_active)->toBeFalse();
});

test('stock users do not see the account management menu', function () {
    $this->actingAs(User::factory()->stock()->create());

    visit(route('dashboard', [], false))
        ->assertDontSee('Usuários')
        ->assertNoJavaScriptErrors();
});
