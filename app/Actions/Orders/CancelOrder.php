<?php

namespace App\Actions\Orders;

use App\Enums\OrderEventType;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CancelOrder
{
    public function __construct(
        private readonly RecordOrderEvent $recordOrderEvent,
    ) {}

    public function handle(Order $order, string $reason, ?User $actor = null): Order
    {
        return DB::transaction(function () use ($order, $reason, $actor): Order {
            $lockedOrder = Order::query()->whereKey($order->getKey())->lockForUpdate()->firstOrFail();

            if ($lockedOrder->status !== OrderStatus::Pending) {
                throw ValidationException::withMessages(['order' => 'Somente pedidos pendentes podem ser cancelados.']);
            }

            $reservedVolumes = $lockedOrder->reservedVolumes()->orderBy('id')->lockForUpdate()->get();
            $volumeIds = $reservedVolumes->modelKeys();
            $reservedVolumes->each->update(['current_order_id' => null]);
            $lockedOrder->update([
                'status' => OrderStatus::Canceled,
                'cancellation_reason' => $reason,
                'canceled_at' => now(),
            ]);

            $this->recordOrderEvent->handle(
                $lockedOrder,
                OrderEventType::Canceled,
                $actor,
                $reason,
                ['released_volume_ids' => $volumeIds],
            );

            return $lockedOrder;
        });
    }
}
