<?php

use App\Enums\AuditAction;
use App\Models\AuditLog;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

test('administrative writes create audit records with actor and snapshots', function () {
    $user = User::factory()->create();
    Auth::login($user);
    $product = Product::factory()->create(['name' => 'Nome original']);

    $created = AuditLog::query()
        ->where('auditable_type', $product->getMorphClass())
        ->where('auditable_id', $product->id)
        ->where('action', AuditAction::Created->value)
        ->sole();

    $product->update(['name' => 'Nome atualizado']);
    $updated = AuditLog::query()
        ->where('auditable_type', $product->getMorphClass())
        ->where('auditable_id', $product->id)
        ->where('action', AuditAction::Updated->value)
        ->latest('id')
        ->sole();

    expect($created->actor_id)->toBe($user->id)
        ->and($created->after['name'])->toBe('Nome original')
        ->and($updated->before['name'])->toBe('Nome original')
        ->and($updated->after['name'])->toBe('Nome atualizado');
});

test('authentication secrets never enter the audit snapshots', function () {
    $user = User::factory()->withTwoFactor()->create();
    $logs = AuditLog::query()
        ->where('auditable_type', $user->getMorphClass())
        ->where('auditable_id', $user->id)
        ->get();

    expect($logs)->not->toBeEmpty();

    foreach ($logs as $log) {
        expect(json_encode([$log->before, $log->after], JSON_THROW_ON_ERROR))
            ->not->toContain('two_factor_secret')
            ->not->toContain('two_factor_recovery_codes')
            ->not->toContain('password')
            ->not->toContain('remember_token');
    }
});

test('restoring a soft-deleted product is audited', function () {
    $this->freezeTime();
    $user = User::factory()->create();
    $this->actingAs($user);
    $product = Product::factory()->create(['name' => 'Produto restaurável'])->refresh();
    $product->delete();
    $deletedAt = $product->getRawOriginal('deleted_at');
    $product->restore();

    $deleted = AuditLog::query()
        ->where('auditable_type', $product->getMorphClass())
        ->where('auditable_id', $product->id)
        ->where('action', AuditAction::Deleted->value)
        ->sole();
    $restored = AuditLog::query()
        ->where('auditable_type', $product->getMorphClass())
        ->where('auditable_id', $product->id)
        ->where('action', AuditAction::Restored->value)
        ->sole();

    expect($deleted->actor_id)->toBe($user->id);
    expect($deleted->before)->toMatchArray(['name' => 'Produto restaurável', 'deleted_at' => null]);
    expect($deleted->after)->toMatchArray(['name' => 'Produto restaurável', 'deleted_at' => $deletedAt]);
    expect($restored->actor_id)->toBe($user->id);
    expect($restored->before)->toMatchArray(['name' => 'Produto restaurável', 'deleted_at' => $deletedAt]);
    expect($restored->after)->toMatchArray(['name' => 'Produto restaurável', 'deleted_at' => null]);
    expect($product->refresh()->trashed())->toBeFalse();
});

test('saving unchanged attributes does not create a misleading update audit', function () {
    $this->freezeTime();
    $product = Product::factory()->create(['name' => 'Produto estável']);

    $product->update(['name' => 'Produto estável']);

    expect(AuditLog::query()->where('auditable_type', Product::class)
        ->where('auditable_id', $product->id)->where('action', AuditAction::Updated->value)->count())->toBe(0);
});

test('editing authentication secrets excludes their names and values from both audit snapshots', function () {
    $user = User::factory()->withTwoFactor()->create(['name' => 'Nome anterior']);
    $oldPassword = $user->getRawOriginal('password');
    $oldSecret = $user->getRawOriginal('two_factor_secret');
    $oldRecoveryCodes = $user->getRawOriginal('two_factor_recovery_codes');

    $user->forceFill(['name' => 'Nome atualizado', 'password' => 'new-sensitive-password',
        'remember_token' => 'new-sensitive-token', 'two_factor_secret' => null, 'two_factor_recovery_codes' => null])->save();

    $audit = AuditLog::query()->where('auditable_type', User::class)->where('auditable_id', $user->id)
        ->where('action', AuditAction::Updated->value)->sole();
    expect($audit->before)->toMatchArray(['name' => 'Nome anterior']);
    expect($audit->after)->toMatchArray(['name' => 'Nome atualizado']);
    expect(json_encode([$audit->before, $audit->after], JSON_THROW_ON_ERROR))
        ->not->toContain('password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes',
            $oldPassword, $oldSecret, $oldRecoveryCodes, $user->getRawOriginal('password'), 'new-sensitive-token');
});

test('audit records cannot be edited or deleted', function () {
    $log = AuditLog::factory()->create();

    expect(fn () => $log->update(['action' => AuditAction::Updated]))
        ->toThrow(LogicException::class)
        ->and(fn () => $log->delete())->toThrow(LogicException::class);
});
