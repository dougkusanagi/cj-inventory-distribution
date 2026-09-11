<?php

namespace App\Actions\Orders;

use App\Enums\OrderEventType;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateOrder
{
    public function __construct(
        private readonly RecordOrderEvent $recordOrderEvent,
    ) {}

    /** @param array<string, mixed> $data */
    public function handle(Order $order, array $data, ?User $actor = null): Order
    {
        return DB::transaction(function () use ($order, $data, $actor): Order {
            $lockedOrder = Order::query()->whereKey($order->getKey())->lockForUpdate()->firstOrFail();

            if ($lockedOrder->status !== OrderStatus::Pending) {
                throw ValidationException::withMessages([
                    'order' => 'Somente pedidos pendentes podem ser editados.',
                ]);
            }

            $before = [
                'store_name' => $lockedOrder->store_name,
                'requester_name' => $lockedOrder->requester_name,
                'whatsapp' => $lockedOrder->whatsapp,
                'notes' => $lockedOrder->notes,
            ];

            $lockedOrder->update([
                'store_name' => $data['store_name'],
                'requester_name' => $data['requester_name'],
                'whatsapp' => $data['whatsapp'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            $this->recordOrderEvent->handle(
                $lockedOrder,
                OrderEventType::Updated,
                $actor,
                null,
                ['before' => $before, 'after' => $lockedOrder->only(array_keys($before))],
            );

            return $lockedOrder;
        });
    }
}
