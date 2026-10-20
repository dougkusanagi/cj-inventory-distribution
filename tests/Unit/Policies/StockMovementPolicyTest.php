<?php

use App\Enums\UserRole;
use App\Models\StockMovement;
use App\Models\User;
use App\Policies\StockMovementPolicy;

test('staff can inspect and reverse movements but cannot edit or delete them', function (?UserRole $role, bool $canInspect) {
    $user = new User;
    $user->forceFill(['role' => $role]);
    $movement = new StockMovement;
    $policy = new StockMovementPolicy;

    expect($policy->viewAny($user))->toBe($canInspect)
        ->and($policy->view($user, $movement))->toBe($canInspect)
        ->and($policy->create($user))->toBe($canInspect)
        ->and($policy->reverse($user, $movement))->toBe($canInspect)
        ->and($policy->update($user, $movement))->toBeFalse()
        ->and($policy->delete($user, $movement))->toBeFalse()
        ->and($policy->restore($user, $movement))->toBeFalse()
        ->and($policy->forceDelete($user, $movement))->toBeFalse();
})->with([
    'admin' => [UserRole::Admin, true],
    'stock' => [UserRole::Stock, true],
    'marketing' => [UserRole::Marketing, false],
    'no role' => [null, false],
]);
