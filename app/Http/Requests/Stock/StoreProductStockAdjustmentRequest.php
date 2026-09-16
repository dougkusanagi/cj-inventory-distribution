<?php

namespace App\Http\Requests\Stock;

use App\Models\StockOfferVolume;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductStockAdjustmentRequest extends FormRequest
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
            'volume_id' => ['required', 'integer', Rule::exists(StockOfferVolume::class, 'id')->whereNull('deleted_at')],
            'expected_version' => ['required', 'integer', 'min:1'],
            'total_quantity' => ['nullable', 'integer', 'min:0'],
            'items' => ['present', 'array', 'max:50'],
            'items.*' => ['required', 'array:id,size,is_active,quantity'],
            'items.*.id' => ['nullable', 'integer'],
            'items.*.size' => ['nullable', 'string', 'max:30'],
            'items.*.is_active' => ['required', 'boolean'],
            'items.*.quantity' => ['nullable', 'integer', 'min:0'],
            'reason' => ['required', 'string', 'max:5000'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'idempotency_key' => ['required', 'string', 'max:160', 'regex:/^[A-Za-z0-9._:-]+$/'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'volume_id.required' => 'Selecione um saco.',
            'volume_id.exists' => 'O saco selecionado não está disponível.',
            'items.required' => 'Informe os tamanhos do saco.',
            'items.*.quantity.min' => 'A quantidade não pode ser negativa.',
            'reason.required' => 'Informe o motivo do ajuste.',
            'idempotency_key.required' => 'Não foi possível atualizar a contagem. Atualize a página e tente novamente.',
        ];
    }
}
