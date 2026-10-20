<?php

namespace App\Actions\Users;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class ProtectAdministratorAccess
{
    /** Call inside the same transaction that changes or deletes the account. */
    public function handle(User $user, ?UserRole $newRole, bool $isActive): User
    {
        $administrators = User::query()->where('role', UserRole::Admin)->orderBy('id')->lockForUpdate()->get();
        $lockedUser = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

        if ($lockedUser->isAdmin()
            && ($newRole !== UserRole::Admin || ! $isActive)
            && $administrators->where('is_active', true)->count() <= 1) {
            throw ValidationException::withMessages(['role' => 'Mantenha pelo menos um administrador ativo.']);
        }

        return $lockedUser;
    }
}
