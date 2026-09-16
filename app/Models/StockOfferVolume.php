<?php

namespace App\Models;

use Database\Factories\StockOfferVolumeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * @property int $id
 * @property int $stock_offer_id
 * @property int $sort_order
 * @property int $total_quantity
 * @property string|null $code
 * @property int|null $current_order_id
 * @property Carbon|null $consumed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['code', 'stock_offer_id', 'sort_order', 'total_quantity', 'current_order_id', 'consumed_at'])]
class StockOfferVolume extends Model
{
    /** @use HasFactory<StockOfferVolumeFactory> */
    use HasFactory, SoftDeletes;

    protected static function booted(): void
    {
        static::deleting(function (self $volume): void {
            if (! $volume->isForceDeleting()
                && ($volume->current_order_id !== null
                    || ($volume->total_quantity > 0 && $volume->consumed_at === null))) {
                throw ValidationException::withMessages([
                    'stock_volumes' => 'Sacos com estoque disponível ou reservado não podem ser removidos. Registre a saída ou zere o estoque do saco antes de removê-lo.',
                ]);
            }

            $volume->items()->withTrashed()->get()
                ->filter(fn (StockOfferVolumeItem $item): bool => ! $item->trashed())
                ->each(fn (StockOfferVolumeItem $item): ?bool => $volume->isForceDeleting()
                    ? $item->forceDelete()
                    : $item->delete());
        });

        static::restored(function (self $volume): void {
            $volume->items()->withTrashed()->get()
                ->filter(fn (StockOfferVolumeItem $item): bool => $item->trashed())
                ->each->restore();
        });
    }

    /**
     * Get the stock offer that owns the sack.
     *
     * @return BelongsTo<StockOffer, $this>
     */
    public function offer(): BelongsTo
    {
        return $this->belongsTo(StockOffer::class, 'stock_offer_id')->withTrashed();
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
     * Get every order item that has referenced this sack.
     *
     * @return HasMany<OrderItem, $this>
     */
    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /** @return HasMany<StockMovementItem, $this> */
    public function stockMovementItems(): HasMany
    {
        return $this->hasMany(StockMovementItem::class, 'stock_offer_volume_id');
    }

    /** @return BelongsTo<Order, $this> */
    public function currentOrder(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'current_order_id')->withTrashed();
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
            'consumed_at' => 'datetime',
        ];
    }
}
