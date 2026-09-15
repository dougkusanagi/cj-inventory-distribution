<?php

namespace App\Models;

use App\Enums\OrderEventType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use LogicException;

/**
 * @property int $id
 * @property int $order_id
 * @property int|null $actor_id
 * @property OrderEventType $event
 * @property string|null $reason
 * @property array<string, mixed>|null $metadata
 * @property Carbon $created_at
 */
#[Fillable(['order_id', 'actor_id', 'event', 'reason', 'metadata'])]
class OrderEvent extends Model
{
    protected static function booted(): void
    {
        static::updating(fn (): never => throw new LogicException('Eventos de pedido são imutáveis.'));
        static::deleting(fn (): never => throw new LogicException('Eventos de pedido não podem ser apagados.'));
    }

    /** @return BelongsTo<Order, $this> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class)->withTrashed();
    }

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id')->withTrashed();
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'event' => OrderEventType::class,
            'metadata' => 'array',
        ];
    }
}
