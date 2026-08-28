<?php

namespace App\Actions\Products;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Throwable;

class UpdateProduct
{
    public function __construct(
        private readonly StoreProductImage $storeProductImage,
        private readonly SyncProductStockOffer $syncProductStockOffer,
    ) {}

    /**
     * Update a product and its size variants atomically.
     *
     * @param  array<string, mixed>  $data
     */
    public function handle(Product $product, array $data): Product
    {
        $addedMedia = [];
        $removedMedia = [];

        try {
            $updatedProduct = DB::transaction(function () use ($product, $data, &$addedMedia, &$removedMedia): Product {
                $product->update([
                    'name' => $data['name'],
                    'model' => ($data['model'] ?? null) ?: null,
                    'notes' => ($data['notes'] ?? null) ?: null,
                ]);

                $rawRemoveMediaIds = $data['remove_media_ids'] ?? [];
                $rawRemoveMediaIds = is_array($rawRemoveMediaIds) ? $rawRemoveMediaIds : [];
                $removeMediaIds = collect($rawRemoveMediaIds)
                    ->filter(fn ($id): bool => is_numeric($id))
                    ->map(fn ($id): int => (int) $id)
                    ->values();
                $mediaToRemove = $product->media()
                    ->where('collection_name', Product::MEDIA_COLLECTION)
                    ->whereKey($removeMediaIds)
                    ->get();
                $removedMedia = $mediaToRemove->all();
                $remainingMediaCount = $product->media()
                    ->where('collection_name', Product::MEDIA_COLLECTION)
                    ->whereNotIn('id', $removeMediaIds)
                    ->count();

                $product->variants()->delete();

                $rawVariants = $data['variants'] ?? [];
                $rawVariants = is_array($rawVariants) ? $rawVariants : [];
                $createdVariants = $this->syncVariants($product, $rawVariants);

                $this->syncProductStockOffer->handle($product, $createdVariants, $data);
                $addedMedia = $this->storeImages($product, $data['images'] ?? [], $remainingMediaCount);
                $this->reorderImages(
                    $product,
                    $data['image_order'] ?? null,
                    $addedMedia,
                    $removeMediaIds->all(),
                );

                return $product->load(['variants', 'latestOffer.items', 'media']);
            });

            foreach ($removedMedia as $media) {
                $media->delete();
            }

            return $updatedProduct;
        } catch (Throwable $exception) {
            foreach ($addedMedia as $media) {
                $media->delete();
            }

            throw $exception;
        }
    }

    /**
     * Store validated images after the remaining media items.
     *
     * @return array<int, Media>
     */
    private function storeImages(Product $product, mixed $images, int $startingOrder): array
    {
        if (! is_array($images)) {
            return [];
        }

        $addedMedia = [];

        foreach ($images as $index => $image) {
            if ($image instanceof UploadedFile) {
                $addedMedia[$index] = $this->storeProductImage->handle(
                    $product,
                    $image,
                    $startingOrder + $index,
                );
            }
        }

        return $addedMedia;
    }

    /**
     * Persist the order selected in the product form.
     *
     * @param  array<int, Media>  $addedMedia
     * @param  array<int, mixed>  $removeMediaIds
     */
    private function reorderImages(
        Product $product,
        mixed $imageOrder,
        array $addedMedia,
        array $removeMediaIds,
    ): void {
        if (! is_array($imageOrder)) {
            return;
        }

        $mediaIdsByUploadIndex = collect($addedMedia)
            ->mapWithKeys(fn (Media $media, int|string $index): array => [
                (int) $index => (int) $media->getKey(),
            ]);
        $ownedMediaIds = $product->media()
            ->where('collection_name', Product::MEDIA_COLLECTION)
            ->whereNotIn('id', $removeMediaIds)
            ->pluck('id')
            ->map(fn (mixed $id): int => (int) $id)
            ->all();
        $orderedMediaIds = [];

        foreach ($imageOrder as $token) {
            if (! is_string($token)) {
                return;
            }

            if (str_starts_with($token, 'media:')) {
                $orderedMediaIds[] = (int) substr($token, strlen('media:'));

                continue;
            }

            if (str_starts_with($token, 'new:')) {
                $uploadIndex = (int) substr($token, strlen('new:'));

                if (! $mediaIdsByUploadIndex->has($uploadIndex)) {
                    return;
                }

                $orderedMediaIds[] = $mediaIdsByUploadIndex->get($uploadIndex);

                continue;
            }

            return;
        }

        $expectedMediaIds = $ownedMediaIds;
        sort($expectedMediaIds);
        $actualMediaIds = $orderedMediaIds;
        sort($actualMediaIds);

        if (
            $expectedMediaIds !== $actualMediaIds
            || count($orderedMediaIds) !== count($ownedMediaIds)
        ) {
            return;
        }

        Media::setNewOrder($orderedMediaIds);
    }

    /**
     * Replace the product's size variants in their display order.
     *
     * @param  array<int, array{size: string, quantity?: int|null, is_active?: bool}>  $variants
     * @return Collection<int, ProductVariant>
     */
    private function syncVariants(Product $product, array $variants): Collection
    {
        return collect($variants)
            ->values()
            ->map(function (array $variant, int $index) use ($product) {
                return $product->variants()->create([
                    'size' => $variant['size'],
                    'sort_order' => $index,
                ]);
            });
    }
}
