<?php

namespace App\Http\Requests\Products;

use App\Enums\StockOfferType;
use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

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
        $isActive = $this->input('is_active');
        $hasStockOffer = $this->input('has_stock_offer');
        $stockOfferType = $this->input('stock_offer_type');
        $stockVolumes = $this->input('stock_volumes');

        if ($isActive === null) {
            $isActive = true;
        }

        if ($hasStockOffer === null) {
            $hasStockOffer = true;
        }

        if (
            $stockOfferType === null
            && filter_var($hasStockOffer, FILTER_VALIDATE_BOOLEAN)
        ) {
            $stockOfferType = StockOfferType::NewGrade->value;
        }

        if (is_array($stockVolumes)) {
            $stockVolumes = $this->normalizeStockVolumes($stockVolumes);
        } elseif ($stockVolumes === null) {
            $stockVolumes = [];
        }

        $this->merge([
            'name' => is_string($name) ? Str::squish($name) : $name,
            'model' => is_string($model) ? Str::squish($model) ?: null : $model,
            'is_active' => $isActive,
            'has_stock_offer' => $hasStockOffer,
            'stock_offer_type' => $stockOfferType,
            'stock_volumes' => $stockVolumes,
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
            'is_active' => ['required', 'boolean'],
            'has_stock_offer' => ['required', 'boolean'],
            'stock_offer_type' => [
                'nullable',
                Rule::requiredIf(fn (): bool => $this->boolean('has_stock_offer')),
                Rule::enum(StockOfferType::class),
            ],
            'stock_volumes' => [
                'nullable',
                'array',
                'max:50',
                Rule::requiredIf(fn (): bool => $this->boolean('has_stock_offer')),
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
            'images' => ['nullable', 'array', 'max:5'],
            'images.*' => [
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:'.Product::MAX_IMAGE_UPLOAD_SIZE_KB,
            ],
            'image_order' => ['nullable', 'array', 'max:5'],
            'image_order.*' => [
                'required',
                'string',
                'distinct',
                'regex:/^(media:[1-9][0-9]*|new:[0-9]+)$/',
            ],
            'remove_media_ids' => ['nullable', 'array', 'max:5'],
            'remove_media_ids.*' => ['integer', 'distinct', 'exists:media,id'],
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
            'is_active.boolean' => 'Informe se o produto está ativo.',
            'has_stock_offer.boolean' => 'Informe se o produto deve aparecer no catálogo.',
            'stock_offer_type.required' => 'Informe o tipo do estoque.',
            'stock_offer_type.enum' => 'Selecione um tipo de estoque válido.',
            'stock_volumes.required' => 'Adicione pelo menos um saco ao estoque.',
            'stock_volumes.array' => 'Envie os sacos em uma lista válida.',
            'stock_volumes.max' => 'Cadastre no máximo 50 sacos por oferta.',
            'stock_volumes.*.array' => 'Envie cada saco em um formato válido.',
            'stock_volumes.*.id' => 'O saco informado não pertence a esta oferta.',
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
            'images.array' => 'Envie as fotos em uma lista válida.',
            'images.max' => 'Adicione no máximo 5 fotos por produto.',
            'images.*.image' => 'Envie imagens válidas.',
            'images.*.mimes' => 'As fotos devem estar em JPG, PNG ou WebP.',
            'images.*.max' => 'Cada foto deve ter no máximo '.Product::MAX_IMAGE_UPLOAD_SIZE_MB.' MB.',
            'image_order.array' => 'Envie a ordem das fotos em uma lista válida.',
            'image_order.max' => 'Ordene no máximo 5 fotos por produto.',
            'image_order.*.required' => 'A ordem das fotos está incompleta.',
            'image_order.*.distinct' => 'Cada foto deve aparecer uma única vez na ordem.',
            'image_order.*.regex' => 'A ordem das fotos enviada é inválida.',
            'remove_media_ids.array' => 'Envie as fotos removidas em uma lista válida.',
            'remove_media_ids.*.integer' => 'A foto selecionada para remoção é inválida.',
            'remove_media_ids.*.distinct' => 'Cada foto deve ser removida uma única vez.',
            'remove_media_ids.*.exists' => 'A foto selecionada para remoção não existe.',
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

                $product = $this->route('product');
                $removeMediaIds = $this->input('remove_media_ids', []);
                $removeMediaIds = is_array($removeMediaIds) ? $removeMediaIds : [];
                $uploadedImages = $this->file('images', []);
                $uploadedImages = is_array($uploadedImages) ? $uploadedImages : [];
                $productImageCount = 0;

                if ($product instanceof Product) {
                    $ownedMediaIds = $product->media()
                        ->where('collection_name', Product::MEDIA_COLLECTION)
                        ->whereKey($removeMediaIds)
                        ->pluck('id')
                        ->map(fn ($id): int => (int) $id)
                        ->all();

                    if (count($ownedMediaIds) !== count($removeMediaIds)) {
                        $validator->errors()->add(
                            'remove_media_ids',
                            'Só é possível remover imagens deste produto.',
                        );
                    }

                    $productImageCount = $product->media()
                        ->where('collection_name', Product::MEDIA_COLLECTION)
                        ->whereNotIn('id', $removeMediaIds)
                        ->count();
                }

                if ($productImageCount + count($uploadedImages) > Product::MAX_IMAGES) {
                    $validator->errors()->add(
                        'images',
                        'Um produto pode ter no máximo 5 fotos.',
                    );
                }

                $imageOrder = $this->input('image_order');

                if (is_array($imageOrder)) {
                    if ($product instanceof Product) {
                        $this->validateImageOrder(
                            $validator,
                            $product,
                            $removeMediaIds,
                            $uploadedImages,
                            $imageOrder,
                        );
                    } else {
                        $this->validateNewImageOrder($validator, $uploadedImages, $imageOrder);
                    }
                }
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

        if ($this->boolean('has_stock_offer') && $stockVolumes === []) {
            $validator->errors()->add(
                'stock_volumes',
                'Adicione pelo menos um saco ao estoque.',
            );

            return;
        }

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
                $this->boolean('has_stock_offer')
                && ! $hasKnownQuantity
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

        $offer = $product->latestOffer()->with('stockVolumes.items')->first();
        $existingVolumes = $offer?->stockVolumes->keyBy('id') ?? collect();
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
                    'O saco informado não pertence a esta oferta.',
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

    /**
     * Ensure an image order references exactly this product's retained media and uploads.
     *
     * @param  array<int, mixed>  $removeMediaIds
     * @param  array<int|string, mixed>  $uploadedImages
     * @param  array<int, mixed>  $imageOrder
     */
    private function validateImageOrder(
        Validator $validator,
        Product $product,
        array $removeMediaIds,
        array $uploadedImages,
        array $imageOrder,
    ): void {
        $hasValidTokens = collect($imageOrder)->every(
            fn (mixed $token): bool => is_string($token)
                && preg_match('/^(media:[1-9][0-9]*|new:[0-9]+)$/', $token) === 1,
        );

        if (! $hasValidTokens) {
            return;
        }

        $normalizedRemoveMediaIds = collect($removeMediaIds)
            ->filter(fn (mixed $id): bool => is_numeric($id))
            ->map(fn (mixed $id): int => (int) $id)
            ->values()
            ->all();
        $expectedMediaIds = $product->media()
            ->where('collection_name', Product::MEDIA_COLLECTION)
            ->whereNotIn('id', $normalizedRemoveMediaIds)
            ->pluck('id')
            ->map(fn (mixed $id): int => (int) $id)
            ->all();
        $orderedMediaIds = [];
        $orderedUploadIndexes = [];

        foreach ($imageOrder as $token) {
            if (str_starts_with($token, 'media:')) {
                $orderedMediaIds[] = (int) substr($token, strlen('media:'));

                continue;
            }

            $orderedUploadIndexes[] = (int) substr($token, strlen('new:'));
        }

        $expectedUploadIndexes = array_map(
            fn (int|string $index): int => (int) $index,
            array_keys($uploadedImages),
        );
        sort($expectedMediaIds);
        sort($orderedMediaIds);
        sort($expectedUploadIndexes);
        sort($orderedUploadIndexes);

        if (
            $expectedMediaIds !== $orderedMediaIds
            || $expectedUploadIndexes !== $orderedUploadIndexes
            || count($imageOrder) !== count($expectedMediaIds) + count($expectedUploadIndexes)
        ) {
            $validator->errors()->add(
                'image_order',
                'A ordem das fotos deve conter somente imagens válidas deste produto.',
            );
        }
    }

    /**
     * Ensure a new product orders every uploaded image exactly once.
     *
     * @param  array<int|string, mixed>  $uploadedImages
     * @param  array<int, mixed>  $imageOrder
     */
    private function validateNewImageOrder(
        Validator $validator,
        array $uploadedImages,
        array $imageOrder,
    ): void {
        $orderedUploadIndexes = collect($imageOrder)
            ->filter(fn (mixed $token): bool => is_string($token) && str_starts_with($token, 'new:'))
            ->map(fn (string $token): int => (int) Str::after($token, 'new:'))
            ->sort()
            ->values()
            ->all();
        $expectedUploadIndexes = collect(array_keys($uploadedImages))
            ->map(fn (int|string $index): int => (int) $index)
            ->sort()
            ->values()
            ->all();

        if (
            $orderedUploadIndexes !== $expectedUploadIndexes
            || count($imageOrder) !== count($expectedUploadIndexes)
        ) {
            $validator->errors()->add(
                'image_order',
                'A ordem das fotos deve conter todas as imagens enviadas.',
            );
        }
    }
}
