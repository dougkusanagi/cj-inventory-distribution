<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\User;

class TechnicalSheetPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || ($user->is_active && $user->role === UserRole::Modeling);
    }
}
