<?php

use App\Enums\UserRole;
use App\Models\Order;
use App\Models\User;
use App\Policies\OrderPolicy;

test('only staff can access and change orders', function (?UserRole $role, bool $allowed) {
    $user = new User;
    $user->forceFill(['role' => $role]);
    $order = new Order;
    $policy = new OrderPolicy;

    expect($policy->viewAny($user))->toBe($allowed)
        ->and($policy->view($user, $order))->toBe($allowed)
        ->and($policy->create($user))->toBe($allowed)
        ->and($policy->update($user, $order))->toBe($allowed)
        ->and($policy->delete($user, $order))->toBeFalse();
})->with([
    'admin' => [UserRole::Admin, true],
    'stock' => [UserRole::Stock, true],
    'marketing' => [UserRole::Marketing, false],
    'no role' => [null, false],
]);
