<?php

namespace App\Http\Requests\Products;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

abstract class ProductRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Prepare values shared by create and update requests.
     */
    protected function prepareForValidation(): void
    {
        $name = $this->input('name');
        $model = $this->input('model');
        $inputVariants = $this->input('variants', []);
        $inputVariants = is_array($inputVariants) ? $inputVariants : [];
        $variants = [];

        foreach ($inputVariants as $variant) {
            $size = is_array($variant) ? ($variant['size'] ?? '') : '';
            $variants[] = [
                'size' => is_string($size) ? Str::squish($size) : '',
            ];
        }

        $this->merge([
            'name' => is_string($name) ? Str::squish($name) : $name,
            'model' => is_string($model) ? Str::squish($model) ?: null : $model,
            'variants' => $variants,
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'model' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'variants' => ['nullable', 'array', 'max:50'],
            'variants.*' => ['array:size'],
            'variants.*.size' => ['required', 'string', 'max:30', 'distinct'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'remove_image' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Get custom messages for product validation errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Informe o nome do produto.',
            'name.max' => 'O nome do produto deve ter no máximo 255 caracteres.',
            'model.max' => 'O modelo deve ter no máximo 100 caracteres.',
            'notes.max' => 'A observação deve ter no máximo 5.000 caracteres.',
            'variants.max' => 'Cadastre no máximo 50 tamanhos.',
            'variants.*.size.required' => 'Informe o tamanho ou remova esta linha.',
            'variants.*.size.max' => 'O tamanho deve ter no máximo 30 caracteres.',
            'variants.*.size.distinct' => 'Os tamanhos precisam ser diferentes.',
            'image.image' => 'Envie uma imagem válida.',
            'image.mimes' => 'A foto deve estar em JPG, PNG ou WebP.',
            'image.max' => 'A foto deve ter no máximo 5 MB.',
        ];
    }
}
