<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $stock_offer_id
 * @property int $product_variant_id
 * @property int|null $quantity
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['stock_offer_id', 'product_variant_id', 'quantity', 'is_active'])]
class StockOfferItem extends Model
{
    use HasFactory;

    /**
     * Get the stock offer that owns the item.
     *
     * @return BelongsTo<StockOffer, $this>
     */
    public function offer(): BelongsTo
    {
        return $this->belongsTo(StockOffer::class, 'stock_offer_id');
    }

    /**
     * Get the product variant that this item details.
     *
     * @return BelongsTo<ProductVariant, $this>
     */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    /**
     * Get the model's attribute casts.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}
