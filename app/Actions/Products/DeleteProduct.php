<?php

namespace App\Actions\Products;

use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeleteProduct
{
    /**
     * Delete a product and its related media through Media Library.
     */
    public function handle(Product $product): void
    {
        if (OrderItem::query()->whereBelongsTo($product)->exists()) {
            throw ValidationException::withMessages([
                'product' => 'Produto vinculado a pedido não pode ser excluído. Desative-o para preservar o histórico.',
            ]);
        }

        DB::transaction(fn (): ?bool => $product->delete());
    }
}
