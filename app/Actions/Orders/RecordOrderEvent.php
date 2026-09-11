<?php

namespace App\Actions\Orders;

use App\Enums\OrderEventType;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\User;

class RecordOrderEvent
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public function handle(
        Order $order,
        OrderEventType $event,
        ?User $actor = null,
        ?string $reason = null,
        array $metadata = [],
    ): OrderEvent {
        return $order->events()->create([
            'actor_id' => $actor?->getKey(),
            'event' => $event,
            'reason' => $reason,
            'metadata' => $metadata === [] ? null : $metadata,
        ]);
    }
}
