<?php

namespace App\Actions\Products;

use App\Models\Product;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Throwable;

class CreateProduct
{
    public function __construct(
        private readonly StoreProductImage $storeProductImage,
        private readonly SyncProductStockOffer $syncProductStockOffer,
    ) {}

    /**
     * Create a product and its stock offer atomically.
     *
     * @param  array<string, mixed>  $data
     */
    public function handle(array $data): Product
    {
        $product = null;
        $addedMedia = [];

        try {
            return DB::transaction(function () use ($data, &$product, &$addedMedia): Product {
                $product = Product::create([
                    'code' => 'PENDING-'.Str::uuid(),
                    'name' => $data['name'],
                    'model' => $data['model'] ?? null,
                    'category_id' => $data['category_id'] ?? null,
                    'line' => $data['line'] ?? null,
                    'notes' => $data['notes'] ?? null,
                    'is_active' => $data['is_active'] ?? true,
                ]);

                $product->updateQuietly([
                    'code' => 'CJ-'.str_pad((string) $product->id, 6, '0', STR_PAD_LEFT),
                ]);

                $this->syncProductStockOffer->handle($product, $data);
                $addedMedia = $this->storeImages($product, $data['images'] ?? []);
                $this->reorderImages($product, $data['image_order'] ?? null, $addedMedia);

                return $product->load([
                    'latestOffer.stockVolumes.items',
                    'media',
                ]);
            });
        } catch (Throwable $exception) {
            foreach ($addedMedia as $media) {
                try {
                    $media->delete();
                } catch (Throwable $cleanupException) {
                    report($cleanupException);
                }
            }

            throw $exception;
        }
    }

    /**
     * Store validated images in their collection order.
     *
     * @return array<int, Media>
     */
    private function storeImages(Product $product, mixed $images): array
    {
        if (! is_array($images)) {
            return [];
        }

        $addedMedia = [];

        try {
            foreach ($images as $index => $image) {
                if ($image instanceof UploadedFile) {
                    $addedMedia[$index] = $this->storeProductImage->handle($product, $image, $index);
                }
            }
        } catch (Throwable $exception) {
            foreach ($addedMedia as $media) {
                try {
                    $media->delete();
                } catch (Throwable $cleanupException) {
                    report($cleanupException);
                }
            }

            throw $exception;
        }

        return $addedMedia;
    }

    /**
     * Persist the order selected for newly uploaded images.
     *
     * @param  array<int, Media>  $addedMedia
     */
    private function reorderImages(Product $product, mixed $imageOrder, array $addedMedia): void
    {
        if (! is_array($imageOrder)) {
            Media::setNewOrder(
                $product->getMedia(Product::MEDIA_COLLECTION)->pluck('id')->all(),
            );

            return;
        }

        $mediaIdsByUploadIndex = collect($addedMedia)
            ->mapWithKeys(fn (Media $media, int|string $index): array => [
                (int) $index => (int) $media->getKey(),
            ]);
        $orderedMediaIds = [];

        foreach ($imageOrder as $token) {
            if (! is_string($token) || ! str_starts_with($token, 'new:')) {
                throw new RuntimeException('The product image order is invalid.');
            }

            $uploadIndex = (int) substr($token, strlen('new:'));

            if (! $mediaIdsByUploadIndex->has($uploadIndex)) {
                throw new RuntimeException('The product image order references an unknown upload.');
            }

            $orderedMediaIds[] = $mediaIdsByUploadIndex->get($uploadIndex);
        }

        $expectedMediaIds = $mediaIdsByUploadIndex->values()->sort()->values()->all();
        $actualMediaIds = collect($orderedMediaIds)->sort()->values()->all();

        if ($actualMediaIds !== $expectedMediaIds || count($orderedMediaIds) !== $mediaIdsByUploadIndex->count()) {
            throw new RuntimeException('The product image order changed during creation.');
        }

        Media::setNewOrder($orderedMediaIds);
    }
}
