<?php

namespace App\Actions\Orders;

use App\Enums\OrderEventType;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\StockOfferVolume;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CompleteOrder
{
    public function __construct(
        private readonly RecordOrderEvent $recordOrderEvent,
    ) {}

    public function handle(Order $order, ?User $actor = null): Order
    {
        return DB::transaction(function () use ($order, $actor): Order {
            $lockedOrder = Order::query()->whereKey($order->getKey())->lockForUpdate()->firstOrFail();

            if ($lockedOrder->status !== OrderStatus::Pending) {
                throw ValidationException::withMessages(['order' => 'Somente pedidos pendentes podem ser finalizados.']);
            }

            $orderItems = $lockedOrder->items()->orderBy('id')->lockForUpdate()->get();

            if ($orderItems->isEmpty() || $orderItems->contains(fn ($item): bool => $item->separated_at === null
                || $item->checked_at === null
                || ($item->divergence_note !== null && $item->divergence_resolved_at === null))) {
                throw ValidationException::withMessages([
                    'order' => 'Todos os sacos precisam estar separados, conferidos e sem divergências antes da finalização.',
                ]);
            }

            $expectedVolumeIds = $orderItems
                ->pluck('stock_offer_volume_id')
                ->map(fn (mixed $id): int => (int) $id)
                ->sort()
                ->values()
                ->all();
            $reservedVolumes = $lockedOrder->reservedVolumes()->orderBy('id')->lockForUpdate()->get();
            $reservedVolumeIds = array_map('intval', $reservedVolumes->modelKeys());

            if ($reservedVolumeIds !== $expectedVolumeIds || $reservedVolumes->contains(fn (StockOfferVolume $volume): bool => $volume->consumed_at !== null)) {
                throw ValidationException::withMessages(['order' => 'A reserva dos sacos mudou. Revise o pedido antes de finalizar.']);
            }

            $reservedVolumes->each->update(['current_order_id' => null, 'consumed_at' => now()]);
            $lockedOrder->update(['status' => OrderStatus::Completed, 'completed_at' => now()]);

            $this->recordOrderEvent->handle(
                $lockedOrder,
                OrderEventType::Completed,
                $actor,
                null,
                ['consumed_volume_ids' => $reservedVolumeIds],
            );

            return $lockedOrder;
        });
    }
}
