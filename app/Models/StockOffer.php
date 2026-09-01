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
 * @property int $total_quantity
 * @property int|null $volumes
 * @property bool $is_active
 * @property string|null $notes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['product_id', 'type', 'total_quantity', 'volumes', 'is_active', 'notes'])]
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
     * Get the items detailing stock per variant.
     *
     * @return HasMany<StockOfferItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(StockOfferItem::class);
    }

    /**
     * Limit offers to the stock that can be shown in the shared catalog.
     *
     * @param  Builder<StockOffer>  $query
     * @return Builder<StockOffer>
     */
    public function scopeAvailableForCatalog(Builder $query): Builder
    {
        return $query
            ->where('is_active', true)
            ->where(function (Builder $query): void {
                $query
                    ->where('type', StockOfferType::NewGrade->value)
                    ->orWhere(function (Builder $query): void {
                        $query
                            ->whereIn('type', [
                                StockOfferType::Replenishment->value,
                                StockOfferType::BrokenGrade->value,
                            ])
                            ->where('volumes', '>', 0);
                    });
            });
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
            'total_quantity' => 'integer',
            'volumes' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}
