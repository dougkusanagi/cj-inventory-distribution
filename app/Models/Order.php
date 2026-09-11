<?php

namespace App\Models;

use App\Enums\OrderStatus;
use Database\Factories\OrderFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $code
 * @property string|null $idempotency_key
 * @property string|null $idempotency_payload_hash
 * @property string $store_name
 * @property string $requester_name
 * @property string|null $whatsapp
 * @property string|null $notes
 * @property OrderStatus $status
 * @property string|null $cancellation_reason
 * @property Carbon $submitted_at
 * @property Carbon|null $completed_at
 * @property Carbon|null $canceled_at
 */
#[Fillable(['code', 'idempotency_key', 'idempotency_payload_hash', 'store_name', 'requester_name', 'whatsapp', 'notes', 'status', 'cancellation_reason', 'submitted_at', 'completed_at', 'canceled_at'])]
class Order extends Model
{
    /** @use HasFactory<OrderFactory> */
    use HasFactory;

    /** @return HasMany<OrderItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /** @return HasMany<StockOfferVolume, $this> */
    public function reservedVolumes(): HasMany
    {
        return $this->hasMany(StockOfferVolume::class, 'current_order_id');
    }

    /** @return HasMany<OrderEvent, $this> */
    public function events(): HasMany
    {
        return $this->hasMany(OrderEvent::class)->latest('id');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
            'submitted_at' => 'datetime',
            'completed_at' => 'datetime',
            'canceled_at' => 'datetime',
        ];
    }
}
