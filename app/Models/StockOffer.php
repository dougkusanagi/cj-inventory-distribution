<?php

namespace App\Models;

use App\Enums\StockOfferType;
use Database\Factories\StockOfferFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $product_id
 * @property StockOfferType $type
 * @property bool $is_active
 * @property string|null $notes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['product_id', 'type', 'is_active', 'notes'])]
class StockOffer extends Model
{
    /** @use HasFactory<StockOfferFactory> */
    use HasFactory;

    /**
     * Get the product that owns the stock offer.
     *
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get the physical sacks that make up this stock offer.
     *
     * @return HasMany<StockOfferVolume, $this>
     */
    public function stockVolumes(): HasMany
    {
        return $this->hasMany(StockOfferVolume::class)
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    /**
     * Limit offers to the stock that can be shown in the shared catalog.
     *
     * @param  Builder<StockOffer>  $query
     * @return Builder<StockOffer>
     */
    public function scopeAvailableForCatalog(Builder $query): Builder
    {
        self::applyAvailableForCatalog($query);

        return $query;
    }

    /**
     * Apply the catalog availability constraints to a stock offer query.
     *
     * @param  Builder<StockOffer>  $query
     */
    public static function applyAvailableForCatalog(Builder $query): void
    {
        $query
            ->where('is_active', true)
            ->whereHas('product', function (Builder $query): void {
                $query->where('is_active', true);
            })
            ->whereHas('stockVolumes', function (Builder $query): void {
                $query->where('total_quantity', '>', 0);
            });
    }

    /**
     * Return the aggregate quantity from physical sacks when available.
     */
    public function calculatedTotalQuantity(): int
    {
        if ($this->relationLoaded('stockVolumes')) {
            return (int) $this->stockVolumes->sum('total_quantity');
        }

        return (int) $this->stockVolumes()->sum('total_quantity');
    }

    /**
     * Determine the number of physical sacks represented by this offer.
     */
    public function calculatedVolumeCount(): int
    {
        if ($this->relationLoaded('stockVolumes')) {
            return $this->stockVolumes->count();
        }

        return (int) $this->stockVolumes()->count();
    }

    /**
     * Get the model's attribute casts.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => StockOfferType::class,
            'is_active' => 'boolean',
        ];
    }
}
