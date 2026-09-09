<?php

namespace App\Actions\Orders;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CancelOrder
{
    public function handle(Order $order, string $reason): Order
    {
        return DB::transaction(function () use ($order, $reason): Order {
            $lockedOrder = Order::query()->whereKey($order->getKey())->lockForUpdate()->firstOrFail();

            if ($lockedOrder->status !== OrderStatus::Pending) {
                throw ValidationException::withMessages(['order' => 'Somente pedidos pendentes podem ser cancelados.']);
            }

            $lockedOrder->reservedVolumes()->update(['current_order_id' => null]);
            $lockedOrder->update([
                'status' => OrderStatus::Canceled,
                'cancellation_reason' => $reason,
                'canceled_at' => now(),
            ]);

            return $lockedOrder;
        });
    }
}
