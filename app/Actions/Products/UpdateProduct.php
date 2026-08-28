<?php

namespace App\Actions\Products;

use App\Models\Product;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

class UpdateProduct
{
    public function __construct(
        private readonly StoreProductImage $storeProductImage,
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

                $variants = $data['variants'] ?? [];
                $variants = is_array($variants) ? $variants : [];
                $sortOrder = 0;

                foreach ($variants as $variant) {
                    if (! is_array($variant) || ! is_string($variant['size'] ?? null)) {
                        continue;
                    }

                    $product->variants()->create([
                        'size' => $variant['size'],
                        'sort_order' => $sortOrder,
                    ]);
                    $sortOrder++;
                }

                return $product->load('variants');
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
}
