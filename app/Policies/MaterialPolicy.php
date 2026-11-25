<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\User;

class MaterialPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || ($user->is_active && $user->role === UserRole::Modeling);
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user): bool
    {
        return $user->isAdmin();
    }
}
