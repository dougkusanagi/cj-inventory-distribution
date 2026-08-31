<?php

namespace App\Http\Requests\Products;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
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
        $totalQuantity = $this->input('total_quantity');
        $inputVariants = $this->input('variants', []);
        $inputVariants = is_array($inputVariants) ? $inputVariants : [];
        $variants = [];

        foreach ($inputVariants as $variant) {
            $size = is_array($variant) ? ($variant['size'] ?? '') : '';
            $quantity = is_array($variant) ? ($variant['quantity'] ?? null) : null;
            $isActive = is_array($variant) ? ($variant['is_active'] ?? true) : true;

            $variants[] = [
                'size' => is_string($size) ? Str::squish($size) : '',
                'quantity' => $quantity === '' || $quantity === null ? null : $quantity,
                'is_active' => $isActive,
            ];
        }

        $this->merge([
            'name' => is_string($name) ? Str::squish($name) : $name,
            'model' => is_string($model) ? Str::squish($model) ?: null : $model,
            'total_quantity' => $totalQuantity === '' || $totalQuantity === null ? null : $totalQuantity,
            'variants' => $variants,
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
            'total_quantity' => ['required', 'integer', 'min:0'],
            'variants' => ['nullable', 'array', 'max:50'],
            'variants.*' => ['array:size,quantity,is_active'],
            'variants.*.size' => ['required', 'string', 'max:30', 'distinct'],
            'variants.*.quantity' => ['nullable', 'integer', 'min:0'],
            'variants.*.is_active' => ['required', 'boolean'],
            'images' => ['nullable', 'array', 'max:5'],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
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
            'total_quantity.required' => 'Informe o estoque total.',
            'total_quantity.integer' => 'O estoque total deve ser um número.',
            'total_quantity.min' => 'O estoque total não pode ser negativo.',
            'variants.max' => 'Cadastre no máximo 50 tamanhos.',
            'variants.*.size.required' => 'Informe o tamanho ou remova esta linha.',
            'variants.*.size.max' => 'O tamanho deve ter no máximo 30 caracteres.',
            'variants.*.size.distinct' => 'Os tamanhos precisam ser diferentes.',
            'variants.*.quantity.integer' => 'A quantidade por tamanho deve ser um número.',
            'variants.*.quantity.min' => 'A quantidade por tamanho não pode ser negativa.',
            'variants.*.is_active.boolean' => 'Informe se o tamanho está disponível neste lote.',
            'images.array' => 'Envie as fotos em uma lista válida.',
            'images.max' => 'Adicione no máximo 5 fotos por produto.',
            'images.*.image' => 'Envie imagens válidas.',
            'images.*.mimes' => 'As fotos devem estar em JPG, PNG ou WebP.',
            'images.*.max' => 'Cada foto deve ter no máximo 5 MB.',
            'image_order.array' => 'Envie a ordem das fotos em uma lista válida.',
            'image_order.max' => 'Ordene no máximo 5 fotos por produto.',
            'image_order.*.regex' => 'A ordem das fotos enviada é inválida.',
        ];
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

                if ($product instanceof Product && is_array($imageOrder)) {
                    $this->validateImageOrder(
                        $validator,
                        $product,
                        $removeMediaIds,
                        $uploadedImages,
                        $imageOrder,
                    );
                }
            },
        ];
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
}
