<?php

namespace App\Actions\Products;

use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DeleteProduct
{
    /**
     * Delete a product, its variants and its stored image.
     */
    public function handle(Product $product): void
    {
        $imagePath = $product->image_path;

        DB::transaction(fn (): ?bool => $product->delete());

        if ($imagePath !== null) {
            Storage::disk('public')->delete($imagePath);
        }
    }
}
