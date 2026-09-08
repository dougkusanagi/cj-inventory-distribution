<?php

namespace App\Models;

use Database\Factories\StockOfferVolumeItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $stock_offer_volume_id
 * @property string $size
 * @property int $sort_order
 * @property bool $is_active
 * @property int|null $quantity
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['stock_offer_volume_id', 'size', 'sort_order', 'is_active', 'quantity'])]
class StockOfferVolumeItem extends Model
{
    /** @use HasFactory<StockOfferVolumeItemFactory> */
    use HasFactory;

    /**
     * Get the sack that contains this size.
     *
     * @return BelongsTo<StockOfferVolume, $this>
     */
    public function volume(): BelongsTo
    {
        return $this->belongsTo(StockOfferVolume::class, 'stock_offer_volume_id');
    }

    /**
     * Get the sack that contains this size.
     *
     * @return BelongsTo<StockOfferVolume, $this>
     */
    public function stockOfferVolume(): BelongsTo
    {
        return $this->volume();
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
            'is_active' => 'boolean',
            'quantity' => 'integer',
        ];
    }
}
