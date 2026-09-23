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
    $product = Product::factory()->create(['name' => 'Produto restaurável']);
    $product->delete();
    $product->restore();

    expect(AuditLog::query()
        ->where('auditable_type', $product->getMorphClass())
        ->where('auditable_id', $product->id)
        ->where('action', AuditAction::Deleted->value)
        ->exists())->toBeTrue()
        ->and(AuditLog::query()
            ->where('auditable_type', $product->getMorphClass())
            ->where('auditable_id', $product->id)
            ->where('action', AuditAction::Restored->value)
            ->exists())->toBeTrue();
});

test('audit records cannot be edited or deleted', function () {
    $log = AuditLog::factory()->create();

    expect(fn () => $log->update(['action' => AuditAction::Updated]))
        ->toThrow(LogicException::class)
        ->and(fn () => $log->delete())->toThrow(LogicException::class);
});
