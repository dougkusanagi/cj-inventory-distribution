<?php

namespace App\Http\Requests\Orders;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class ResolveOrderItemDivergenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff() ?? false;
    }

    /** @return array<string, array<int, string>> */
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
            'reason.required' => 'Informe como a divergência foi resolvida.',
            'reason.max' => 'A resolução deve ter no máximo 1.000 caracteres.',
        ];
    }
}
