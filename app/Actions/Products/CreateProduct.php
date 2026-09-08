<?php

namespace App\Actions\Products;

use App\Models\Product;
use Illuminate\Http\UploadedFile;
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
                    'model' => ($data['model'] ?? null) ?: null,
                    'notes' => ($data['notes'] ?? null) ?: null,
                    'is_active' => $data['is_active'] ?? true,
                ]);

                $product->updateQuietly([
                    'code' => 'CJ-'.str_pad((string) $product->id, 6, '0', STR_PAD_LEFT),
                ]);

                $this->syncProductStockOffer->handle($product, $data);
                $addedMedia = $this->storeImages($product, $data['images'] ?? []);
                Media::setNewOrder(
                    $product->getMedia(Product::MEDIA_COLLECTION)->pluck('id')->all(),
                );

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
}
