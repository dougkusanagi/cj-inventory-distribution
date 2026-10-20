<?php

namespace App\Actions\Users;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class UpdateUserAccount
{
    public function __construct(private readonly ProtectAdministratorAccess $protectAdministratorAccess) {}

    /** @param array{name: string, email: string, role: string, is_active: bool|int|string} $data */
    public function handle(User $user, array $data, User $actor): User
    {
        return DB::transaction(function () use ($user, $data, $actor): User {
            Gate::forUser($actor->fresh())->authorize('update', $user);
            $role = UserRole::from($data['role']);
            $active = (bool) $data['is_active'];
            $lockedUser = $this->protectAdministratorAccess->handle($user, $role, $active);
            Gate::forUser($actor->fresh())->authorize('update', $lockedUser);

            if ($actor->is($lockedUser) && ($role !== UserRole::Admin || ! $active)) {
                throw ValidationException::withMessages(['role' => 'Você não pode remover o próprio acesso de administrador.']);
            }

            $accessChanged = $lockedUser->role !== $role || $lockedUser->is_active !== $active || $lockedUser->email !== $data['email'];
            if ($accessChanged) {
                Password::broker()->deleteToken($lockedUser);
            }
            $lockedUser->fill(['name' => $data['name'], 'email' => $data['email']]);
            if ($lockedUser->isDirty('email')) {
                $lockedUser->email_verified_at = null;
            }
            $lockedUser->forceFill(['role' => $role, 'is_active' => $active]);
            if ($accessChanged) {
                $lockedUser->remember_token = Str::random(60);
            }
            $lockedUser->save();

            if ($accessChanged && config('session.driver') === 'database') {
                DB::connection(config('session.connection'))->table(config('session.table', 'sessions'))->where('user_id', $lockedUser->id)->delete();
            }

            return $lockedUser;
        }, 5);
    }
}
