<?php

namespace App\Http\Requests\Stock;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStockExitRequest extends FormRequest
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
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'volume_ids' => ['required', 'array', 'min:1', 'max:50'],
            'volume_ids.*' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('stock_offer_volumes', 'id')->whereNull('deleted_at'),
            ],
            'reason' => ['required', 'string', 'max:5000'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'idempotency_key' => ['required', 'string', 'max:160', 'regex:/^[A-Za-z0-9._:-]+$/'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'volume_ids.required' => 'Selecione pelo menos um saco.',
            'volume_ids.min' => 'Selecione pelo menos um saco.',
            'volume_ids.*.exists' => 'Um ou mais sacos não estão disponíveis.',
            'volume_ids.*.distinct' => 'Cada saco deve ser selecionado uma única vez.',
            'reason.required' => 'Informe o motivo da saída.',
            'idempotency_key.required' => 'Não foi possível registrar a saída. Atualize a página e tente novamente.',
            'idempotency_key.regex' => 'Não foi possível registrar a saída. Atualize a página e tente novamente.',
        ];
    }
}
