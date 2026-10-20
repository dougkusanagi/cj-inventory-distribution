<?php

namespace App\Actions\Users;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class DeleteUserAccount
{
    public function __construct(private readonly ProtectAdministratorAccess $protectAdministratorAccess) {}

    public function handle(User $user): void
    {
        DB::transaction(function () use ($user): void {
            $this->protectAdministratorAccess->handle($user, null, false)->delete();
        }, 5);
    }
}
