<?php

namespace App\Models;

use Database\Factories\OrderItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $product_name_snapshot
 * @property string $product_code_snapshot
 * @property string|null $product_model_snapshot
 * @property string $volume_code_snapshot
 * @property int $total_quantity
 * @property array<int, array{size: string, quantity: int|null}> $size_grid
 * @property Carbon|null $separated_at
 * @property int|null $separated_by
 * @property Carbon|null $checked_at
 * @property int|null $checked_by
 * @property string|null $divergence_note
 * @property Carbon|null $divergence_reported_at
 * @property int|null $divergence_reported_by
 * @property Carbon|null $divergence_resolved_at
 * @property int|null $divergence_resolved_by
 */
#[Fillable(['order_id', 'stock_offer_volume_id', 'product_id', 'product_code_snapshot', 'product_name_snapshot', 'product_model_snapshot', 'category_snapshot', 'line_snapshot', 'offer_type_snapshot', 'volume_code_snapshot', 'total_quantity', 'size_grid', 'separated_at', 'separated_by', 'checked_at', 'checked_by', 'divergence_note', 'divergence_reported_at', 'divergence_reported_by', 'divergence_resolved_at', 'divergence_resolved_by'])]
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
            'separated_at' => 'datetime',
            'checked_at' => 'datetime',
            'divergence_reported_at' => 'datetime',
            'divergence_resolved_at' => 'datetime',
        ];
    }
}
