<?php

namespace App\Console\Commands;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Users\SyncProductionStages;
use App\Enums\ProductionStage;
use App\Enums\UserRole;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

use function Laravel\Prompts\intro;
use function Laravel\Prompts\multiselect;
use function Laravel\Prompts\outro;
use function Laravel\Prompts\password;
use function Laravel\Prompts\select;
use function Laravel\Prompts\text;

#[Signature('user:create')]
#[Description('Cria um usuário com acesso à área interna')]
class CreateUser extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(CreateNewUser $createNewUser, SyncProductionStages $syncProductionStages): int
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

        $role = select(
            label: 'Perfil de acesso',
            options: collect(UserRole::cases())
                ->mapWithKeys(fn (UserRole $role): array => [$role->value => $role->label()])
                ->all(),
            default: UserRole::Stock->value,
            hint: 'Produção acompanha os setores atribuídos; Marketing gerencia fotos.',
        );

        $stages = $role === UserRole::Production->value
            ? multiselect(
                label: 'Setores responsáveis',
                options: collect(ProductionStage::cases())
                    ->mapWithKeys(fn (ProductionStage $stage): array => [$stage->value => $stage->label()])
                    ->all(),
                required: 'Selecione ao menos um setor.',
                hint: 'Use a barra de espaço para selecionar.',
            )
            : [];
        $user = DB::transaction(function () use ($createNewUser, $syncProductionStages, $name, $email, $userPassword, $role, $stages) {
            $user = $createNewUser->create([
                'name' => trim($name),
                'email' => $email,
                'password' => $userPassword,
                'password_confirmation' => $userPassword,
            ]);
            $user->forceFill(['role' => UserRole::from((string) $role)])->save();
            $syncProductionStages->handle($user, array_map(fn (int|string $stage): string => ProductionStage::from((string) $stage)->value, $stages));

            return $user;
        });

        outro("Usuário {$user->email} criado com o perfil {$user->role?->label()}.");

        return self::SUCCESS;
    }

    /** @param array<int, mixed> $rules */
    private function validationError(string $attribute, string $value, array $rules): ?string
    {
        $validator = Validator::make([$attribute => $value], [$attribute => $rules]);

        return $validator->fails() ? $validator->errors()->first($attribute) : null;
    }
}
