<?php

namespace App\Models;

use Database\Factories\OrderItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['order_id', 'stock_offer_volume_id', 'product_id', 'product_code_snapshot', 'product_name_snapshot', 'product_model_snapshot', 'category_snapshot', 'line_snapshot', 'offer_type_snapshot', 'volume_code_snapshot', 'total_quantity', 'size_grid'])]
class OrderItem extends Model
{
    /** @use HasFactory<OrderItemFactory> */
    use HasFactory;

    /** @return BelongsTo<Order, $this> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /** @return BelongsTo<StockOfferVolume, $this> */
    public function stockVolume(): BelongsTo
    {
        return $this->belongsTo(StockOfferVolume::class, 'stock_offer_volume_id');
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'size_grid' => 'array',
            'total_quantity' => 'integer',
        ];
    }
}
