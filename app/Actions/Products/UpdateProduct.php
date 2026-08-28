<?php

namespace App\Actions\Products;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
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
        $oldImagePath = $product->image_path;
        $newImagePath = $oldImagePath;

        try {
            $updatedProduct = DB::transaction(function () use ($product, $data, &$newImagePath): Product {
                if (($data['image'] ?? null) instanceof UploadedFile) {
                    $newImagePath = $this->storeProductImage->handle($data['image']);
                } elseif (filter_var($data['remove_image'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
                    $newImagePath = null;
                }

                $product->update([
                    'name' => $data['name'],
                    'model' => ($data['model'] ?? null) ?: null,
                    'image_path' => $newImagePath,
                    'notes' => ($data['notes'] ?? null) ?: null,
                ]);

                $product->variants()->delete();

                $rawVariants = $data['variants'] ?? [];
                $rawVariants = is_array($rawVariants) ? $rawVariants : [];
                $createdVariants = $this->syncVariants($product, $rawVariants);

                $this->syncProductStockOffer->handle($product, $createdVariants, $data);

                return $product->load(['variants', 'latestOffer.items']);
            });

            if ($oldImagePath !== $newImagePath && $oldImagePath !== null) {
                Storage::disk('public')->delete($oldImagePath);
            }

            return $updatedProduct;
        } catch (Throwable $exception) {
            if ($newImagePath !== $oldImagePath && $newImagePath !== null) {
                Storage::disk('public')->delete($newImagePath);
            }

            throw $exception;
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
