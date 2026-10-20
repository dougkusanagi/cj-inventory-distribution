<?php

use App\Actions\Fortify\ResetUserPassword;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\User;
use App\Notifications\UserAccessLink;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;

function managedUserData(User $user, array $changes = []): array
{
    return array_replace(['name' => $user->name, 'email' => $user->email, 'role' => $user->role?->value, 'is_active' => $user->is_active], $changes);
}

test('only administrators can manage accounts', function (string $state, string $method, string $routeName) {
    $target = User::factory()->marketing()->create();
    $actor = User::factory()->{$state}()->create();

    $this->actingAs($actor)->{$method}(route($routeName, $routeName === 'users.index' || $routeName === 'users.store' ? [] : $target), managedUserData($target))
        ->assertForbidden();
})->with(['stock', 'marketing', 'nonStaff'])->with([
    'list' => ['get', 'users.index'],
    'create' => ['post', 'users.store'],
    'update' => ['put', 'users.update'],
    'send link' => ['post', 'users.access-link'],
]);

test('guests cannot access user management', function () {
    $this->get(route('users.index'))->assertRedirect(route('login'));
});

test('administrators search and filter paginated accounts without exposing secrets', function () {
    $admin = User::factory()->create();
    $marketing = User::factory()->marketing()->create(['name' => 'Ana Marketing']);
    User::factory()->stock()->create(['name' => 'Ana Estoque']);
    User::factory()->marketing()->inactive()->create(['name' => 'Ana Inativa']);

    $this->actingAs($admin)->get(route('users.index', ['search' => 'Ana', 'role' => 'marketing', 'status' => 'active']))
        ->assertInertia(fn (Assert $page) => $page->component('users/index')
            ->has('users.data', 1)->where('users.data.0.id', $marketing->id)
            ->where('auth.can.manageUsers', true)
            ->missing('users.data.0.password')->missing('users.data.0.remember_token')->missing('users.data.0.two_factor_secret'));
});

test('administrators create individual accounts and send a password setup link', function () {
    $admin = User::factory()->create();
    Notification::fake();

    $this->actingAs($admin)->post(route('users.store'), [
        'name' => '  Ana  Marketing ', 'email' => ' ANA@EXAMPLE.COM ', 'role' => 'marketing',
        'password' => 'unsafe', 'email_verified_at' => now()->toISOString(), 'is_active' => false,
    ])->assertSessionHasNoErrors()->assertRedirect(route('users.index'));

    $user = User::where('email', 'ana@example.com')->sole();
    expect($user->name)->toBe('Ana Marketing')->and($user->role)->toBe(UserRole::Marketing)
        ->and($user->is_active)->toBeTrue()->and($user->email_verified_at)->toBeNull()
        ->and(Hash::check('unsafe', $user->password))->toBeFalse();
    Notification::assertSentTo($user, UserAccessLink::class, fn (UserAccessLink $notification): bool => Password::tokenExists($user, $notification->token));
    expect(AuditLog::query()->where('auditable_type', User::class)->where('auditable_id', $user->id)->where('action', 'created')->exists())->toBeTrue();
});

test('account setup token verifies email and allows the invited role to log in', function () {
    $admin = User::factory()->create();
    Notification::fake();
    $this->actingAs($admin)->post(route('users.store'), ['name' => 'Ana', 'email' => 'ana@example.com', 'role' => 'marketing']);
    $user = User::where('email', 'ana@example.com')->sole();
    $token = Notification::sent($user, UserAccessLink::class)->sole()->token;
    auth()->logout();
    Event::fake([Verified::class]);

    $this->post(route('password.update'), ['email' => $user->email, 'token' => $token, 'password' => 'password', 'password_confirmation' => 'password'])
        ->assertSessionHasNoErrors()->assertRedirect(route('login'));

    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
    Event::assertDispatched(Verified::class);
    $this->post(route('login'), ['email' => $user->email, 'password' => 'password'])->assertSessionHasNoErrors();
    $this->get(route('dashboard'))->assertRedirect(route('product-photos.index'));
    $this->get(route('users.index'))->assertForbidden();
    auth()->logout();
    $this->post(route('password.update'), ['email' => $user->email, 'token' => $token, 'password' => 'another-password', 'password_confirmation' => 'another-password'])
        ->assertSessionHasErrors('email');
});

test('administrators cannot reuse a deleted account email or submit an invalid role', function () {
    $admin = User::factory()->create();
    $deleted = User::factory()->stock()->create();
    $deleted->delete();
    Notification::fake();

    $this->actingAs($admin)->post(route('users.store'), ['name' => 'Duplicado', 'email' => $deleted->email, 'role' => 'owner'])
        ->assertInvalid(['email', 'role']);

    Notification::assertNothingSent();
    expect(User::withTrashed()->count())->toBe(2);
});

test('administrators update roles and invalidate existing database sessions and reset tokens', function () {
    config(['session.driver' => 'database']);
    $admin = User::factory()->create();
    $user = User::factory()->stock()->create();
    $oldRememberToken = $user->remember_token;
    $token = Password::createToken($user);
    DB::table('sessions')->insert(['id' => 'old-session', 'user_id' => $user->id, 'payload' => '', 'last_activity' => now()->timestamp]);

    $this->actingAs($admin)->put(route('users.update', $user), managedUserData($user, ['role' => 'marketing']))
        ->assertSessionHasNoErrors();

    expect($user->fresh()->role)->toBe(UserRole::Marketing)->and($user->fresh()->remember_token)->not->toBe($oldRememberToken)
        ->and(Password::tokenExists($user, $token))->toBeFalse();
    $this->assertDatabaseMissing('sessions', ['id' => 'old-session']);
    expect(AuditLog::where('auditable_type', User::class)->where('auditable_id', $user->id)->where('action', 'updated')->exists())->toBeTrue();
});

test('changing an email requires confirmation of the new address', function () {
    $admin = User::factory()->create();
    $user = User::factory()->marketing()->create();

    $this->actingAs($admin)->put(route('users.update', $user), managedUserData($user, ['email' => 'new@example.com']))
        ->assertSessionHasNoErrors();

    expect($user->fresh()->email)->toBe('new@example.com')->and($user->fresh()->email_verified_at)->toBeNull();
});

test('administrators cannot remove their own access even when another administrator exists', function (array $changes) {
    $admin = User::factory()->create();
    User::factory()->create();

    $this->actingAs($admin)->put(route('users.update', $admin), managedUserData($admin, $changes))->assertInvalid('role');

    expect($admin->fresh()->isAdmin())->toBeTrue();
})->with(['demotion' => [['role' => 'stock']], 'deactivation' => [['is_active' => false]]]);

test('the last administrator cannot delete their own profile', function () {
    $admin = User::factory()->create();

    $this->actingAs($admin)->delete(route('profile.destroy'), ['password' => 'password'])->assertInvalid('password');

    $this->assertModelExists($admin);
    expect($admin->fresh()->trashed())->toBeFalse();
    $this->assertAuthenticatedAs($admin);
});

test('a stale administrator request cannot remove the last administrator', function () {
    $first = User::factory()->create();
    $second = User::factory()->create();
    $this->actingAs($first)->put(route('users.update', $second), managedUserData($second, ['role' => 'stock']))->assertSessionHasNoErrors();

    $this->actingAs($second)->put(route('users.update', $first), managedUserData($first, ['is_active' => false]))->assertForbidden();

    expect($first->fresh()->isAdmin())->toBeTrue();
});

test('deactivated accounts cannot use passwords or existing sessions', function () {
    $user = User::factory()->inactive()->create();

    $this->post(route('login'), ['email' => $user->email, 'password' => 'password'])->assertInvalid('email');
    $this->assertGuest();
    $this->actingAs($user)->get(route('dashboard'))->assertForbidden();
    $this->assertGuest();
});

test('administrators can deactivate and reactivate accounts without deleting their history', function () {
    $admin = User::factory()->create();
    $user = User::factory()->marketing()->create();
    $this->actingAs($admin)->put(route('users.update', $user), managedUserData($user, ['is_active' => false]))->assertSessionHasNoErrors();
    expect($user->fresh()->is_active)->toBeFalse()->and($user->fresh()->trashed())->toBeFalse();

    $this->put(route('users.update', $user), managedUserData($user, ['is_active' => true]))->assertSessionHasNoErrors();

    expect($user->fresh()->is_active)->toBeTrue();
});

test('access link delivery is throttled and disabled accounts cannot receive admin links', function () {
    $admin = User::factory()->create();
    $user = User::factory()->marketing()->create();
    Notification::fake();
    $this->actingAs($admin)->post(route('users.access-link', $user))->assertSessionHasNoErrors();
    $this->post(route('users.access-link', $user))->assertInertiaFlash('toast.message', 'Aguarde um minuto antes de reenviar o link.');
    Notification::assertSentToTimes($user, UserAccessLink::class, 1);
    $user->forceFill(['is_active' => false])->save();

    $this->post(route('users.access-link', $user))->assertForbidden();
    Notification::assertSentToTimes($user, UserAccessLink::class, 1);
});

test('deactivation invalidates a password setup token', function () {
    $admin = User::factory()->create();
    $user = User::factory()->unverified()->marketing()->create();
    $token = Password::createToken($user);
    $this->actingAs($admin)->put(route('users.update', $user), managedUserData($user, ['is_active' => false]));
    auth()->logout();

    $this->post(route('password.update'), ['email' => $user->email, 'token' => $token, 'password' => 'password', 'password_confirmation' => 'password'])->assertInvalid('email');

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('mail failures preserve the created account and offer a retry', function () {
    $admin = User::factory()->create();
    Notification::shouldReceive('send')->once()->andThrow(new RuntimeException('SMTP unavailable'));

    $this->actingAs($admin)->post(route('users.store'), ['name' => 'Ana', 'email' => 'ana@example.com', 'role' => 'marketing'])
        ->assertRedirect(route('users.index'))->assertInertiaFlash('toast.type', 'error');

    $this->assertDatabaseHas('users', ['email' => 'ana@example.com', 'role' => 'marketing']);
});

test('a reset already in flight cannot confirm a replacement email address', function () {
    $admin = User::factory()->create();
    $user = User::factory()->unverified()->marketing()->create();
    $token = Password::createToken($user);
    $this->actingAs($admin)->put(route('users.update', $user), managedUserData($user, ['email' => 'replacement@example.com']))->assertSessionHasNoErrors();

    expect(fn () => app(ResetUserPassword::class)->reset($user, [
        'email' => $user->email, 'token' => $token, 'password' => 'changed-password', 'password_confirmation' => 'changed-password',
    ]))->toThrow(ValidationException::class);

    expect($user->fresh()->email)->toBe('replacement@example.com')->and($user->fresh()->hasVerifiedEmail())->toBeFalse()
        ->and(Hash::check('password', $user->fresh()->password))->toBeTrue();
});
