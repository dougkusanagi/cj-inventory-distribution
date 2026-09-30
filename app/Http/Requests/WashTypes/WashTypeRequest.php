<?php

namespace App\Http\Requests\WashTypes;

use App\Models\WashType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class WashTypeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'slug' => [
                'required',
                'string',
                'max:120',
                Rule::unique(WashType::class)->whereNull('deleted_at')->ignore(
                    $this->route('washType') instanceof WashType
                        ? $this->route('washType')->id
                        : null,
                ),
            ],
            'is_active' => ['required', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $name = $this->input('name');
        $name = is_string($name) ? Str::squish($name) : $name;

        $this->merge([
            'name' => $name,
            'slug' => is_string($name) ? Str::slug($name) : null,
            'is_active' => $this->input('is_active', true),
        ]);
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'name.required' => 'Informe o nome do tipo de lavagem.',
            'name.max' => 'O nome deve ter no máximo 100 caracteres.',
            'slug.unique' => 'Já existe um tipo de lavagem com esse nome.',
            'is_active.boolean' => 'Informe se o tipo de lavagem está ativo.',
        ];
    }
}
