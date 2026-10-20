<?php

namespace App\Http\Requests\Products;

use App\Http\Requests\Products\Concerns\ValidatesProductImages;
use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateProductPhotosRequest extends FormRequest
{
    use ValidatesProductImages;

    public function authorize(): bool
    {
        return $this->user()?->can('managePhotos', Product::class) ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return $this->imageRules();
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return $this->imageMessages();
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            fn (Validator $validator) => $this->validateProductImages($validator),
        ];
    }
}
