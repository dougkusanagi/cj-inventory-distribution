<?php

namespace App\Models;

use Database\Factories\StockMovementItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

/**
 * @property int $id
 * @property int $stock_movement_id
 * @property int|null $stock_offer_volume_id
 * @property int|null $product_id
 * @property int|null $stock_offer_id
 * @property string $volume_code_snapshot
 * @property string|null $product_code_snapshot
 * @property string|null $product_name_snapshot
 * @property string|null $product_model_snapshot
 * @property string|null $category_snapshot
 * @property string|null $line_snapshot
 * @property string|null $offer_type_snapshot
 * @property int $total_quantity
 * @property array<int, array{size: string, quantity: int|null}>|null $size_grid_snapshot
 * @property array<string, mixed>|null $previous_state
 * @property array<string, mixed>|null $resulting_state
 */
#[Fillable(['stock_movement_id', 'stock_offer_volume_id', 'product_id', 'stock_offer_id', 'volume_code_snapshot', 'product_code_snapshot', 'product_name_snapshot', 'product_model_snapshot', 'category_snapshot', 'line_snapshot', 'offer_type_snapshot', 'total_quantity', 'size_grid_snapshot', 'previous_state', 'resulting_state'])]
class StockMovementItem extends Model
{
    /** @use HasFactory<StockMovementItemFactory> */
    use HasFactory;

    public $timestamps = false;

    protected static function booted(): void
    {
        static::updating(fn (): never => throw new LogicException('Itens de movimentação são imutáveis.'));
        static::deleting(fn (): never => throw new LogicException('Itens de movimentação não podem ser apagados.'));
    }

    /** @return BelongsTo<StockMovement, $this> */
    public function movement(): BelongsTo
    {
        return $this->belongsTo(StockMovement::class, 'stock_movement_id');
    }

    /** @return BelongsTo<StockOfferVolume, $this> */
    public function volume(): BelongsTo
    {
        return $this->belongsTo(StockOfferVolume::class, 'stock_offer_volume_id')->withTrashed();
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    /** @return BelongsTo<StockOffer, $this> */
    public function offer(): BelongsTo
    {
        return $this->belongsTo(StockOffer::class, 'stock_offer_id')->withTrashed();
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'total_quantity' => 'integer',
            'size_grid_snapshot' => 'array',
            'previous_state' => 'array',
            'resulting_state' => 'array',
        ];
    }
}
