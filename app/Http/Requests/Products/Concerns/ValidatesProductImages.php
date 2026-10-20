<?php

namespace App\Http\Requests\Products\Concerns;

use App\Models\Product;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

trait ValidatesProductImages
{
    /**
     * Rules for uploads, ordering and removal of product images.
     *
     * @return array<string, array<int, mixed>>
     */
    protected function imageRules(): array
    {
        return [
            'images' => ['nullable', 'array', 'max:5'],
            'images.*' => [
                'bail',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:'.Product::MAX_IMAGE_UPLOAD_SIZE_KB,
                Rule::dimensions()->maxWidth(Product::MAX_IMAGE_INPUT_DIMENSION)->maxHeight(Product::MAX_IMAGE_INPUT_DIMENSION),
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
     * Messages for product image validation errors.
     *
     * @return array<string, string>
     */
    protected function imageMessages(): array
    {
        return [
            'images.array' => 'Envie as fotos em uma lista válida.',
            'images.max' => 'Adicione no máximo 5 fotos por produto.',
            'images.*.image' => 'Envie imagens válidas.',
            'images.*.mimes' => 'As fotos devem estar em JPG, PNG ou WebP.',
            'images.*.max' => 'Cada foto deve ter no máximo '.Product::MAX_IMAGE_UPLOAD_SIZE_MB.' MB.',
            'images.*.dimensions' => 'Cada foto deve ter no máximo '.Product::MAX_IMAGE_INPUT_DIMENSION.' pixels de largura e altura.',
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
     * Validate ownership, the five-photo limit and the submitted order.
     */
    protected function validateProductImages(Validator $validator): void
    {
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
