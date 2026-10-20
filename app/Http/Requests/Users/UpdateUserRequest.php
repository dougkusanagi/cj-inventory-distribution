<?php

namespace App\Http\Requests\Users;

use App\Models\User;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends StoreUserRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('user')) ?? false;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $user = $this->route('user');

        return [
            ...parent::rules(),
            'email' => ['required', 'email', 'max:255', Rule::unique(User::class)->ignore($user instanceof User ? $user->id : null)],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
