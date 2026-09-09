<?php

namespace App\Http\Requests\Categories;

use App\Models\Category;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CategoryRequest extends FormRequest
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
                Rule::unique(Category::class)->ignore(
                    $this->route('category') instanceof Category
                        ? $this->route('category')->id
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
            'name.required' => 'Informe o nome da categoria.',
            'name.max' => 'O nome deve ter no máximo 100 caracteres.',
            'slug.unique' => 'Já existe uma categoria com esse nome.',
            'is_active.boolean' => 'Informe se a categoria está ativa.',
        ];
    }
}
