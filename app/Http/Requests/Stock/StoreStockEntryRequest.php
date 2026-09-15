<?php

namespace App\Http\Requests\Stock;

use App\Enums\StockOfferType;
use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreStockEntryRequest extends FormRequest
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
            'product_id' => [
                'required',
                'integer',
                Rule::exists(Product::class, 'id')->whereNull('deleted_at'),
            ],
            'stock_offer_type' => ['required', Rule::enum(StockOfferType::class)],
            'reason' => ['required', 'string', 'max:5000'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'idempotency_key' => ['required', 'string', 'max:160', 'regex:/^[A-Za-z0-9._:-]+$/'],
            'stock_volumes' => ['required', 'array', 'min:1', 'max:50'],
            'stock_volumes.*' => ['required', 'array:total_quantity,items'],
            'stock_volumes.*.total_quantity' => ['nullable', 'integer', 'min:0'],
            'stock_volumes.*.items' => ['nullable', 'array', 'max:50'],
            'stock_volumes.*.items.*' => ['required', 'array:size,is_active,quantity'],
            'stock_volumes.*.items.*.size' => ['required', 'string', 'max:30'],
            'stock_volumes.*.items.*.is_active' => ['required', 'boolean'],
            'stock_volumes.*.items.*.quantity' => ['nullable', 'integer', 'min:0'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $volumes = $this->input('stock_volumes');

        if (is_array($volumes)) {
            foreach ($volumes as $volumeIndex => $volume) {
                if (! is_array($volume)) {
                    continue;
                }

                $items = $volume['items'] ?? [];

                if (is_array($items)) {
                    foreach ($items as $itemIndex => $item) {
                        if (! is_array($item)) {
                            continue;
                        }

                        $items[$itemIndex] = [
                            'size' => is_string($item['size'] ?? null) ? Str::squish($item['size']) : $item['size'] ?? null,
                            'is_active' => filter_var($item['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN),
                            'quantity' => $item['quantity'] ?? null,
                        ];
                    }
                }

                $volumes[$volumeIndex] = [
                    'total_quantity' => $volume['total_quantity'] ?? null,
                    'items' => $items,
                ];
            }
        }

        $this->merge([
            'reason' => is_string($this->input('reason')) ? Str::squish($this->input('reason')) : $this->input('reason'),
            'notes' => is_string($this->input('notes')) ? Str::squish($this->input('notes')) : $this->input('notes'),
            'idempotency_key' => is_string($this->input('idempotency_key')) ? trim($this->input('idempotency_key')) : $this->input('idempotency_key'),
            'stock_volumes' => $volumes,
        ]);
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'product_id.exists' => 'Selecione um produto válido.',
            'stock_offer_type.required' => 'Informe o tipo do estoque.',
            'stock_offer_type.enum' => 'Selecione um tipo de estoque válido.',
            'reason.required' => 'Informe o motivo da entrada.',
            'idempotency_key.required' => 'Informe uma chave para evitar duplicidade.',
            'idempotency_key.regex' => 'A chave de idempotência contém caracteres inválidos.',
            'stock_volumes.required' => 'Adicione pelo menos um saco.',
            'stock_volumes.min' => 'Adicione pelo menos um saco.',
            'stock_volumes.*.items.*.size.required' => 'Informe o tamanho do saco.',
        ];
    }

    /** @return array<int, callable> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            $volumes = $this->input('stock_volumes');

            if (! is_array($volumes)) {
                return;
            }

            foreach ($volumes as $volumeIndex => $volume) {
                if (! is_array($volume)) {
                    continue;
                }

                $items = is_array($volume['items'] ?? null) ? $volume['items'] : [];
                $seenSizes = [];
                $hasKnownQuantity = false;
                $knownTotal = 0;

                foreach ($items as $itemIndex => $item) {
                    if (! is_array($item)) {
                        continue;
                    }

                    $normalizedSize = Str::lower(Str::squish((string) ($item['size'] ?? '')));

                    if ($normalizedSize !== '' && isset($seenSizes[$normalizedSize])) {
                        $validator->errors()->add(
                            "stock_volumes.{$volumeIndex}.items.{$itemIndex}.size",
                            'Os tamanhos precisam ser diferentes dentro do saco.',
                        );
                    }

                    if ($normalizedSize !== '') {
                        $seenSizes[$normalizedSize] = true;
                    }

                    if (filter_var($item['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN)
                        && is_numeric($item['quantity'] ?? null)) {
                        $hasKnownQuantity = true;
                        $knownTotal += max(0, (int) $item['quantity']);
                    }
                }

                $total = $hasKnownQuantity ? $knownTotal : ($volume['total_quantity'] ?? null);

                if ($total === null || $total === '' || (int) $total <= 0) {
                    $validator->errors()->add(
                        "stock_volumes.{$volumeIndex}.total_quantity",
                        'A entrada precisa ter estoque físico maior que zero.',
                    );
                }
            }
        }];
    }
}
