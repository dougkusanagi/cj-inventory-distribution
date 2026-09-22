<?php

use App\Models\StockMovement;
use App\Models\User;
use App\Policies\StockMovementPolicy;

test('staff can inspect and reverse movements but cannot edit or delete them', function (bool $isStaff, bool $canInspect) {
    $user = new User;
    $user->forceFill(['is_staff' => $isStaff]);
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
    'staff' => [true, true],
    'non-staff' => [false, false],
]);
