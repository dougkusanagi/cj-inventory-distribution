<?php

namespace App\Models;

use Database\Factories\StockOfferVolumeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $stock_offer_id
 * @property int $sort_order
 * @property int $total_quantity
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['stock_offer_id', 'sort_order', 'total_quantity'])]
class StockOfferVolume extends Model
{
    /** @use HasFactory<StockOfferVolumeFactory> */
    use HasFactory;

    /**
     * Get the stock offer that owns the sack.
     *
     * @return BelongsTo<StockOffer, $this>
     */
    public function offer(): BelongsTo
    {
        return $this->belongsTo(StockOffer::class, 'stock_offer_id');
    }

    /**
     * Get the stock offer that owns the sack.
     *
     * @return BelongsTo<StockOffer, $this>
     */
    public function stockOffer(): BelongsTo
    {
        return $this->offer();
    }

    /**
     * Get the sizes contained in this sack.
     *
     * @return HasMany<StockOfferVolumeItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(StockOfferVolumeItem::class)
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    /**
     * Get the model's attribute casts.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'total_quantity' => 'integer',
        ];
    }
}
