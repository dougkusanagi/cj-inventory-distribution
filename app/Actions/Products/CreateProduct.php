<?php

namespace App\Actions\Products;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Throwable;

class CreateProduct
{
    public function __construct(
        private readonly StoreProductImage $storeProductImage,
        private readonly SyncProductStockOffer $syncProductStockOffer,
    ) {}

    /**
     * Create a product and its size variants atomically.
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
                    'model' => ($data['model'] ?? null) ?: null,
                    'notes' => ($data['notes'] ?? null) ?: null,
                    'is_active' => $data['is_active'] ?? true,
                ]);

                $product->updateQuietly([
                    'code' => 'CJ-'.str_pad((string) $product->id, 6, '0', STR_PAD_LEFT),
                ]);

                $createdVariants = $this->syncVariants($product, $data['variants'] ?? []);
                $this->syncProductStockOffer->handle($product, $createdVariants, $data);
                $addedMedia = $this->storeImages($product, $data['images'] ?? []);
                Media::setNewOrder(
                    $product->getMedia(Product::MEDIA_COLLECTION)->pluck('id')->all(),
                );

                return $product->load(['variants', 'latestOffer.items', 'media']);
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
