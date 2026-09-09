<?php

namespace App\Http\Requests\Orders;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class CancelOrderRequest extends FormRequest
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
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'max:1000'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $reason = $this->input('reason');
        $this->merge(['reason' => is_string($reason) ? Str::squish($reason) : $reason]);
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'reason.required' => 'Informe o motivo do cancelamento.',
            'reason.max' => 'O motivo deve ter no máximo 1.000 caracteres.',
        ];
    }
}
