<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\ResetsUserPasswords;

class ResetUserPassword implements ResetsUserPasswords
{
    use PasswordValidationRules;

    /**
     * Validate and reset the user's forgotten password.
     *
     * @param  array<string, string>  $input
     */
    public function reset(User $user, array $input): void
    {
        Validator::make($input, [
            'password' => $this->passwordRules(),
        ])->validate();

        DB::transaction(function () use ($user, $input): void {
            $lockedUser = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            if (! $lockedUser->is_active || $lockedUser->email !== $user->email
                || ! Password::broker()->tokenExists($lockedUser, $input['token'] ?? '')) {
                throw ValidationException::withMessages(['email' => 'Este link não está mais disponível. Solicite um novo link ou fale com o administrador.']);
            }
            $lockedUser->forceFill([
                'password' => $input['password'],
                'remember_token' => Str::random(60),
            ])->save();

            if (! $lockedUser->hasVerifiedEmail()) {
                $lockedUser->markEmailAsVerified();
                event(new Verified($lockedUser));
            }
            Password::broker()->deleteToken($lockedUser);
            $user->setRawAttributes($lockedUser->getAttributes(), sync: true);
        }, 5);
    }
}
