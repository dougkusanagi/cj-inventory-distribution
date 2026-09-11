<?php

namespace App\Console\Commands;

use App\Actions\Fortify\CreateNewUser;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

use function Laravel\Prompts\intro;
use function Laravel\Prompts\outro;
use function Laravel\Prompts\password;
use function Laravel\Prompts\text;

#[Signature('user:create')]
#[Description('Cria um usuário com acesso à área interna')]
class CreateUser extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(CreateNewUser $createNewUser): int
    {
        intro('Criar usuário da equipe');

        $name = text(
            label: 'Nome completo',
            placeholder: 'Ex.: Ana Souza',
            required: 'Informe o nome do usuário.',
            validate: fn (string $value): ?string => $this->validationError('name', $value, ['string', 'max:255']),
        );
        $email = text(
            label: 'E-mail',
            placeholder: 'ana@empresa.com.br',
            required: 'Informe o e-mail do usuário.',
            validate: fn (string $value): ?string => $this->validationError('email', $value, ['email', 'max:255', 'unique:users,email']),
            transform: fn (string $value): string => mb_strtolower(trim($value)),
        );
        $email = mb_strtolower(trim($email));
        $userPassword = password(
            label: 'Senha',
            required: 'Informe uma senha.',
            validate: fn (string $value): ?string => $this->validationError('password', $value, [Password::default()]),
            hint: 'Use uma senha forte com pelo menos 8 caracteres.',
        );
        password(
            label: 'Confirme a senha',
            required: 'Confirme a senha.',
            validate: fn (string $value): ?string => $value === $userPassword ? null : 'As senhas não coincidem.',
        );

        $user = $createNewUser->create([
            'name' => trim($name),
            'email' => $email,
            'password' => $userPassword,
            'password_confirmation' => $userPassword,
        ]);
        $user->forceFill(['is_staff' => true])->save();

        outro("Usuário {$user->email} criado com sucesso.");

        return self::SUCCESS;
    }

    /** @param array<int, mixed> $rules */
    private function validationError(string $attribute, string $value, array $rules): ?string
    {
        $validator = Validator::make([$attribute => $value], [$attribute => $rules]);

        return $validator->fails() ? $validator->errors()->first($attribute) : null;
    }
}
