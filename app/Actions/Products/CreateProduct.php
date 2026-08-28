<?php

namespace App\Actions\Products;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
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

        try {
            return DB::transaction(function () use ($data, &$product): Product {
                $product = Product::create([
                    'code' => 'PENDING-'.Str::uuid(),
                    'name' => $data['name'],
                    'model' => ($data['model'] ?? null) ?: null,
                    'notes' => ($data['notes'] ?? null) ?: null,
                ]);

                $product->updateQuietly([
                    'code' => 'CJ-'.str_pad((string) $product->id, 6, '0', STR_PAD_LEFT),
                ]);

                $createdVariants = $this->syncVariants($product, $data['variants'] ?? []);
                $this->syncProductStockOffer->handle($product, $createdVariants, $data);
                $this->storeImages($product, $data['images'] ?? []);

                return $product->load(['variants', 'latestOffer.items', 'media']);
            });
        } catch (Throwable $exception) {
            if ($product !== null) {
                $product->clearMediaCollection(Product::MEDIA_COLLECTION);
            }

            throw $exception;
        }
    }

    /**
     * Store validated images in their collection order.
     */
    private function storeImages(Product $product, mixed $images): void
    {
        if (! is_array($images)) {
            return;
        }

        foreach ($images as $index => $image) {
            if ($image instanceof UploadedFile) {
                $this->storeProductImage->handle($product, $image, $index);
            }
        }
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
