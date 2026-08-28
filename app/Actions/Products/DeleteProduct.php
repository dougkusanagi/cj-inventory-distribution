<?php

namespace App\Actions\Products;

use App\Models\Product;
use Illuminate\Support\Facades\DB;

class DeleteProduct
{
    /**
     * Delete a product and its related media through Media Library.
     */
    public function handle(Product $product): void
    {
        DB::transaction(fn (): ?bool => $product->delete());
    }
}
