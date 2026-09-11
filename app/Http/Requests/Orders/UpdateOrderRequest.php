<?php

namespace App\Http\Requests\Orders;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class UpdateOrderRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isStaff() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'store_name' => ['required', 'string', 'max:255'],
            'requester_name' => ['required', 'string', 'max:255'],
            'whatsapp' => ['nullable', 'string', 'max:30'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    protected function prepareForValidation(): void
    {
        foreach (['store_name', 'requester_name', 'whatsapp', 'notes'] as $key) {
            $value = $this->input($key);
            $this->merge([$key => is_string($value) ? (Str::squish($value) ?: null) : $value]);
        }
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'store_name.required' => 'Informe a loja.',
            'requester_name.required' => 'Informe o responsável pelo pedido.',
        ];
    }
}
