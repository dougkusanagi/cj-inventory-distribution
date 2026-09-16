<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** @property array<int, array<string, mixed>>|null $counted_items */
#[Fillable(['inventory_count_id', 'stock_offer_volume_id', 'expected_version', 'snapshot', 'counted_items', 'counted_total', 'stock_movement_id'])]
class InventoryCountItem extends Model
{
    /** @return BelongsTo<StockOfferVolume, $this> */
    public function volume(): BelongsTo
    {
        return $this->belongsTo(StockOfferVolume::class, 'stock_offer_volume_id')->withTrashed();
    }

    protected function casts(): array
    {
        return ['snapshot' => 'array', 'counted_items' => 'array', 'counted_total' => 'integer', 'expected_version' => 'integer'];
    }
}
