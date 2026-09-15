<?php

namespace App\Models;

use App\Enums\StockMovementSource;
use App\Enums\StockMovementType;
use Database\Factories\StockMovementFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use LogicException;

/**
 * @property int $id
 * @property StockMovementType $type
 * @property StockMovementSource $source
 * @property int|null $actor_id
 * @property int|null $order_id
 * @property int|null $reversal_of_id
 * @property string|null $reason
 * @property string|null $notes
 * @property string|null $idempotency_key
 * @property string|null $payload_hash
 * @property Carbon $occurred_at
 * @property Carbon $created_at
 */
#[Fillable(['type', 'source', 'actor_id', 'order_id', 'reversal_of_id', 'reason', 'notes', 'idempotency_key', 'payload_hash', 'occurred_at'])]
class StockMovement extends Model
{
    /** @use HasFactory<StockMovementFactory> */
    use HasFactory;

    public $timestamps = false;

    protected static function booted(): void
    {
        static::updating(fn (): never => throw new LogicException('Movimentações de estoque são imutáveis.'));
        static::deleting(fn (): never => throw new LogicException('Movimentações de estoque não podem ser apagadas.'));
    }

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id')->withTrashed();
    }

    /** @return BelongsTo<Order, $this> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class)->withTrashed();
    }

    /** @return BelongsTo<StockMovement, $this> */
    public function reversalOf(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reversal_of_id');
    }

    /** @return HasMany<StockMovement, $this> */
    public function reversals(): HasMany
    {
        return $this->hasMany(self::class, 'reversal_of_id');
    }

    /** @return HasMany<StockMovementItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(StockMovementItem::class)->orderBy('id');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'type' => StockMovementType::class,
            'source' => StockMovementSource::class,
            'occurred_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }
}
