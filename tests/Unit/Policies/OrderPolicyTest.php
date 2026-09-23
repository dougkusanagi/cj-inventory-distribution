<?php

use App\Models\Order;
use App\Models\User;
use App\Policies\OrderPolicy;

test('only staff can access and change orders', function (bool $isStaff, bool $allowed) {
    $user = new User;
    $user->forceFill(['is_staff' => $isStaff]);
    $order = new Order;
    $policy = new OrderPolicy;

    expect($policy->viewAny($user))->toBe($allowed)
        ->and($policy->view($user, $order))->toBe($allowed)
        ->and($policy->create($user))->toBe($allowed)
        ->and($policy->update($user, $order))->toBe($allowed)
        ->and($policy->delete($user, $order))->toBeFalse();
})->with([
    'staff' => [true, true],
    'non-staff' => [false, false],
]);
