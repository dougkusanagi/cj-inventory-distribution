<?php

namespace App\Actions\Users;

use App\Models\User;
use App\Notifications\UserAccessLink;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;
use Throwable;

class SendUserAccessLink
{
    public function handle(User $user, bool $created = false): void
    {
        $prefix = $created ? 'Conta criada. ' : '';
        try {
            $status = Password::broker()->sendResetLink(
                ['email' => $user->email, 'is_active' => true],
                function (User $recipient, string $token): void {
                    $recipient->notify(new UserAccessLink($token));
                },
            );
        } catch (Throwable $exception) {
            report($exception);
            Inertia::flash('toast', ['type' => 'error', 'message' => $prefix.'Não foi possível enviar o e-mail. Tente reenviar o link em um minuto.']);

            return;
        }
        Inertia::flash('toast', [
            'type' => $status === Password::RESET_LINK_SENT ? 'success' : 'error',
            'message' => $prefix.match ($status) {
                Password::RESET_LINK_SENT => 'Link enviado por e-mail para '.$user->email.'.',
                Password::RESET_THROTTLED => 'Aguarde um minuto antes de reenviar o link.',
                default => 'Não foi possível enviar o link para esta conta.',
            },
        ]);
    }
}
