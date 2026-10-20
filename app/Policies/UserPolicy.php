<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, User $managedUser): bool
    {
        return $user->isAdmin();
    }

    public function sendAccessLink(User $user, User $managedUser): bool
    {
        return $user->isAdmin() && $managedUser->is_active;
    }
}
