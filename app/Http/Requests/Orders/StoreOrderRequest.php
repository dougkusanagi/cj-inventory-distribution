<?php

namespace App\Http\Requests\Orders;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class StoreOrderRequest extends FormRequest
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
            'store_name' => ['required', 'string', 'max:255'],
            'requester_name' => ['required', 'string', 'max:255'],
            'whatsapp' => ['nullable', 'string', 'max:30'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'volume_ids' => ['required', 'array', 'min:1', 'max:50'],
            'volume_ids.*' => ['required', 'integer', 'distinct', 'exists:stock_offer_volumes,id'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'store_name' => $this->squish('store_name'),
            'requester_name' => $this->squish('requester_name'),
            'whatsapp' => $this->squish('whatsapp') ?: null,
            'notes' => $this->squish('notes') ?: null,
        ]);
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'store_name.required' => 'Informe a loja.',
            'requester_name.required' => 'Informe o responsável pelo pedido.',
            'volume_ids.required' => 'Selecione pelo menos um saco.',
            'volume_ids.min' => 'Selecione pelo menos um saco.',
            'volume_ids.*.exists' => 'Um dos sacos selecionados não existe mais.',
        ];
    }

    private function squish(string $key): mixed
    {
        $value = $this->input($key);

        return is_string($value) ? Str::squish($value) : $value;
    }
}
