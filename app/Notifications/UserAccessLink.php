<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class UserAccessLink extends Notification
{
    public function __construct(public readonly string $token) {}

    /** @return list<string> */
    public function via(User $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Defina sua senha — CJ Stock Distribution')
            ->greeting('Olá, '.$notifiable->name.'!')
            ->line('Você recebeu um link para criar ou trocar a senha da sua conta.')
            ->action('Definir minha senha', route('password.reset', ['token' => $this->token, 'email' => $notifiable->email]))
            ->line('Este link expira em '.config('auth.passwords.users.expire').' minutos e só pode ser usado uma vez.')
            ->line('Se você não esperava este convite, ignore este e-mail.');
    }
}
