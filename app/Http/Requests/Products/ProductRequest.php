<?php

namespace App\Http\Requests\Products;

use App\Enums\ProductLine;
use App\Enums\StockOfferType;
use App\Http\Requests\Products\Concerns\ValidatesProductImages;
use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

abstract class ProductRequest extends FormRequest
{
    use ValidatesProductImages;

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
        $isActive = $this->input('is_active');
        $stockOfferType = $this->input('stock_offer_type');
        $stockVolumes = $this->input('stock_volumes');

        if ($isActive === null) {
            $isActive = true;
        }

        if (is_array($stockVolumes)) {
            $stockVolumes = $this->normalizeStockVolumes($stockVolumes);
        } elseif ($stockVolumes === null) {
            $stockVolumes = [];
        }

        $normalizedModel = is_string($model) ? Str::squish($model) : $model;

        $this->merge([
            'name' => is_string($name) ? Str::squish($name) : $name,
            'model' => $normalizedModel === '' ? null : $normalizedModel,
            'is_active' => $isActive,
            'stock_offer_type' => $stockOfferType,
            ...($this->exists('stock_volumes') ? ['stock_volumes' => $stockVolumes] : []),
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
            'name' => ['required', 'string', 'max:80'],
            'model' => ['nullable', 'string', 'max:100'],
            'category_id' => [
                'nullable',
                'integer',
                Rule::exists('categories', 'id')->whereNull('deleted_at'),
            ],
            'wash_type_id' => [
                'nullable',
                'integer',
                Rule::exists('wash_types', 'id')->whereNull('deleted_at')->where(function ($query): void {
                    $query->where('is_active', true);
                    $product = $this->route('product');
                    if ($product instanceof Product && $product->wash_type_id !== null) {
                        $query->orWhere('id', $product->wash_type_id);
                    }
                }),
            ],
            'line' => ['nullable', Rule::enum(ProductLine::class)],
            'notes' => ['nullable', 'string', 'max:5000'],
            'is_active' => ['required', 'boolean'],
            'stock_offer_type' => ['nullable', Rule::enum(StockOfferType::class)],
            'stock_volumes' => [
                'nullable',
                'array',
                'max:50',
            ],
            'stock_volumes.*' => ['array:id,sort_order,total_quantity,items'],
            'stock_volumes.*.id' => ['nullable', 'integer', 'min:1', 'distinct'],
            'stock_volumes.*.total_quantity' => ['nullable', 'integer', 'min:0'],
            'stock_volumes.*.items' => ['nullable', 'array', 'max:50'],
            'stock_volumes.*.items.*' => ['array:id,size,sort_order,is_active,quantity'],
            'stock_volumes.*.items.*.id' => ['nullable', 'integer', 'min:1', 'distinct'],
            'stock_volumes.*.items.*.size' => ['required', 'string', 'max:30'],
            'stock_volumes.*.items.*.sort_order' => ['nullable', 'integer', 'min:0'],
            'stock_volumes.*.items.*.is_active' => ['required', 'boolean'],
            'stock_volumes.*.items.*.quantity' => ['nullable', 'integer', 'min:0'],
            ...$this->imageRules(),
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
            'wash_type_id.exists' => 'Selecione um tipo de lavagem ativo.',
            'name.required' => 'Informe o nome do produto.',
            'name.max' => 'O nome do produto deve ter no máximo 80 caracteres.',
            'model.max' => 'O modelo deve ter no máximo 100 caracteres.',
            'category_id.exists' => 'Selecione uma categoria válida.',
            'line.enum' => 'Selecione uma linha válida.',
            'notes.max' => 'A observação deve ter no máximo 5.000 caracteres.',
            'is_active.boolean' => 'Informe se o produto está ativo.',
            'stock_offer_type.enum' => 'Selecione um tipo de grade válido.',
            'stock_volumes.required' => 'Adicione pelo menos um saco ao estoque.',
            'stock_volumes.array' => 'Envie os sacos em uma lista válida.',
            'stock_volumes.max' => 'Cadastre no máximo 50 sacos por oferta.',
            'stock_volumes.*.array' => 'Envie cada saco em um formato válido.',
            'stock_volumes.*.id' => 'O saco informado não pertence a este produto.',
            'stock_volumes.*.total_quantity.integer' => 'O total do saco deve ser um número.',
            'stock_volumes.*.total_quantity.min' => 'O total do saco não pode ser negativo.',
            'stock_volumes.*.items.array' => 'Envie os tamanhos do saco em uma lista válida.',
            'stock_volumes.*.items.max' => 'Cadastre no máximo 50 tamanhos por saco.',
            'stock_volumes.*.items.*.array' => 'Envie cada tamanho do saco em um formato válido.',
            'stock_volumes.*.items.*.id' => 'O tamanho informado não pertence a este saco.',
            'stock_volumes.*.items.*.size.required' => 'Informe o tamanho ou remova esta linha.',
            'stock_volumes.*.items.*.size.max' => 'O tamanho deve ter no máximo 30 caracteres.',
            'stock_volumes.*.items.*.size.distinct' => 'Os tamanhos precisam ser diferentes dentro do saco.',
            'stock_volumes.*.items.*.is_active.boolean' => 'Informe se o tamanho está disponível neste saco.',
            'stock_volumes.*.items.*.quantity.integer' => 'A quantidade do tamanho deve ser um número.',
            'stock_volumes.*.items.*.quantity.min' => 'A quantidade do tamanho não pode ser negativa.',
            ...$this->imageMessages(),
        ];
    }

    /**
     * Normalize sack and size values before the wildcard rules run.
     *
     * @param  array<int|string, mixed>  $stockVolumes
     * @return array<int|string, mixed>
     */
    private function normalizeStockVolumes(array $stockVolumes): array
    {
        foreach ($stockVolumes as $volumeIndex => $volume) {
            if (! is_array($volume)) {
                continue;
            }

            $items = $volume['items'] ?? [];

            if (is_array($items)) {
                foreach ($items as $itemIndex => $item) {
                    if (! is_array($item)) {
                        continue;
                    }

                    $size = $item['size'] ?? '';
                    $quantity = $item['quantity'] ?? null;
                    $isActive = filter_var($item['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN);

                    $items[$itemIndex] = [
                        'id' => $item['id'] ?? null,
                        'size' => is_string($size) ? Str::squish($size) : $size,
                        'sort_order' => $item['sort_order'] ?? null,
                        'is_active' => $isActive,
                        'quantity' => $isActive && $quantity !== '' && $quantity !== null
                            ? $quantity
                            : null,
                    ];
                }
            }

            $totalQuantity = $volume['total_quantity'] ?? null;
            $stockVolumes[$volumeIndex] = [
                'id' => $volume['id'] ?? null,
                'total_quantity' => $totalQuantity === '' || $totalQuantity === null
                    ? null
                    : $totalQuantity,
                'items' => $items,
            ];
        }

        return $stockVolumes;
    }

    /**
     * Validate the total number of images kept by a product.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $this->validateVolumePayload($validator);
                $this->validateVolumePayloadReferences($validator);

                $this->validateProductImages($validator);
            },
        ];
    }

    /**
     * Require a manual total only when a sack has no known active quantities.
     */
    private function validateVolumePayload(Validator $validator): void
    {
        if (! is_array($this->input('stock_volumes'))) {
            return;
        }

        $stockVolumes = $this->input('stock_volumes');

        foreach ($stockVolumes as $volumeIndex => $volume) {
            if (! is_array($volume)) {
                continue;
            }

            $items = $volume['items'] ?? [];
            $seenSizes = [];

            if (is_array($items)) {
                foreach ($items as $itemIndex => $item) {
                    if (! is_array($item) || ! is_string($item['size'] ?? null)) {
                        continue;
                    }

                    $normalizedSize = strtolower(Str::squish($item['size']));

                    if ($normalizedSize === '') {
                        continue;
                    }

                    if (isset($seenSizes[$normalizedSize])) {
                        $validator->errors()->add(
                            "stock_volumes.{$volumeIndex}.items.{$itemIndex}.size",
                            'Os tamanhos precisam ser diferentes dentro do saco.',
                        );
                    }

                    $seenSizes[$normalizedSize] = true;
                }
            }

            $hasKnownQuantity = is_array($items) && collect($items)->contains(
                fn (mixed $item): bool => is_array($item)
                    && filter_var($item['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN)
                    && ($item['quantity'] ?? null) !== null
                    && $item['quantity'] !== ''
                    && is_numeric($item['quantity']),
            );
            $totalQuantity = $volume['total_quantity'] ?? null;

            if (
                ! $hasKnownQuantity
                && ($totalQuantity === null || $totalQuantity === '')
            ) {
                $validator->errors()->add(
                    "stock_volumes.{$volumeIndex}.total_quantity",
                    'Informe o total do saco quando nenhuma quantidade por tamanho for conhecida.',
                );
            }
        }
    }

    /**
     * Ensure submitted sack and size IDs belong to the product being updated.
     */
    private function validateVolumePayloadReferences(Validator $validator): void
    {
        $product = $this->route('product');

        if (! $product instanceof Product) {
            return;
        }

        $existingVolumes = $product->stockVolumes()->with('items')->get()->keyBy('id');
        $stockVolumes = $this->input('stock_volumes', []);

        if (! is_array($stockVolumes)) {
            return;
        }

        foreach ($stockVolumes as $volumeIndex => $volume) {
            if (! is_array($volume)) {
                continue;
            }

            $volumeId = $volume['id'] ?? null;
            $existingVolume = is_numeric($volumeId)
                ? $existingVolumes->get((int) $volumeId)
                : null;

            if ($volumeId !== null && $existingVolume === null) {
                $validator->errors()->add(
                    "stock_volumes.{$volumeIndex}.id",
                    'O saco informado não pertence a este produto.',
                );
            }

            $existingItems = $existingVolume?->items->keyBy('id') ?? collect();
            $items = $volume['items'] ?? [];

            if (! is_array($items)) {
                continue;
            }

            foreach ($items as $itemIndex => $item) {
                if (! is_array($item) || ($item['id'] ?? null) === null) {
                    continue;
                }

                $itemId = $item['id'];

                if (! is_numeric($itemId) || ! $existingItems->has((int) $itemId)) {
                    $validator->errors()->add(
                        "stock_volumes.{$volumeIndex}.items.{$itemIndex}.id",
                        'O tamanho informado não pertence a este saco.',
                    );
                }
            }
        }
    }
}
