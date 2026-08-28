<?php

namespace App\Actions\Products;

use App\Models\Product;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class CreateProduct
{
    public function __construct(
        private readonly StoreProductImage $storeProductImage,
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

                $this->syncVariants($product, $data['variants'] ?? []);

                return $product->load('variants');
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
     * @param  array<int, array{size: string}>  $variants
     */
    private function syncVariants(Product $product, array $variants): void
    {
        $product->variants()->createMany(
            collect($variants)
                ->values()
                ->map(fn (array $variant, int $index): array => [
                    'size' => $variant['size'],
                    'sort_order' => $index,
                ])
                ->all(),
        );
    }
}
