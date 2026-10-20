<?php

namespace App\Actions\Users;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class CreateUserAccount
{
    /** @param array{name: string, email: string, role: string} $data */
    public function handle(array $data, User $actor): User
    {
        return DB::transaction(function () use ($data, $actor): User {
            $actor = User::query()->whereKey($actor->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('create', User::class);
            $user = new User(['name' => $data['name'], 'email' => $data['email'], 'password' => Str::password(64)]);
            $user->forceFill(['role' => UserRole::from($data['role']), 'is_active' => true])->save();

            return $user;
        }, 5);
    }
}
