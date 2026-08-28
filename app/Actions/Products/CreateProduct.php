<?php

namespace App\Actions\Products;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
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
        $imagePath = null;

        try {
            return DB::transaction(function () use ($data, &$imagePath): Product {
                $imagePath = $this->storeImage($data['image'] ?? null);

                $product = Product::create([
                    'code' => 'PENDING-'.Str::uuid(),
                    'name' => $data['name'],
                    'model' => ($data['model'] ?? null) ?: null,
                    'image_path' => $imagePath,
                    'notes' => ($data['notes'] ?? null) ?: null,
                ]);

                $product->updateQuietly([
                    'code' => 'CJ-'.str_pad((string) $product->id, 6, '0', STR_PAD_LEFT),
                ]);

                $createdVariants = $this->syncVariants($product, $data['variants'] ?? []);
                $this->syncProductStockOffer->handle($product, $createdVariants, $data);

                return $product->load(['variants', 'latestOffer.items']);
            });
        } catch (Throwable $exception) {
            if ($imagePath !== null) {
                Storage::disk('public')->delete($imagePath);
            }

            throw $exception;
        }
    }

    /**
     * Store a validated image with a generated filename.
     */
    private function storeImage(mixed $image): ?string
    {
        return $image instanceof UploadedFile
            ? $this->storeProductImage->handle($image)
            : null;
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
