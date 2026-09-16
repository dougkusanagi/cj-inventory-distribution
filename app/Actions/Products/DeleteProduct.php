<?php

namespace App\Actions\Products;

use App\Actions\Stock\StockMutation;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\StockOfferVolume;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

class DeleteProduct
{
    /**
     * Delete a product and its related media through Media Library.
     */
    public function handle(Product $product): void
    {
        StockMutation::run(function () use ($product): void {
            if (OrderItem::withTrashed()->whereBelongsTo($product)->exists()) {
                throw ValidationException::withMessages([
                    'product' => 'Produto vinculado a pedido não pode ser excluído. Desative-o para preservar o histórico.',
                ]);
            }

            if (StockOfferVolume::query()
                ->whereHas('offer', fn (Builder $query): Builder => $query->where('product_id', $product->getKey()))
                ->where(function (Builder $query): void {
                    $query->whereNotNull('current_order_id')
                        ->orWhere(function (Builder $query): void {
                            $query->where('total_quantity', '>', 0)
                                ->whereNull('consumed_at');
                        });
                })
                ->exists()) {
                throw ValidationException::withMessages([
                    'product' => 'Produto com estoque disponível ou reservado não pode ser excluído. Registre uma saída ou zere os sacos pelo fluxo de estoque.',
                ]);
            }

            $product->delete();
        });
    }
}
