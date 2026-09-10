<?php

namespace App\Actions\Orders;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CompleteOrder
{
    public function handle(Order $order, bool $whatsappOpened): Order
    {
        return DB::transaction(function () use ($order, $whatsappOpened): Order {
            $lockedOrder = Order::query()->whereKey($order->getKey())->lockForUpdate()->firstOrFail();

            if ($lockedOrder->status !== OrderStatus::Pending) {
                throw ValidationException::withMessages(['order' => 'Somente pedidos pendentes podem ser finalizados.']);
            }

            if (! $whatsappOpened) {
                throw ValidationException::withMessages(['whatsapp_opened' => 'Abra o WhatsApp do pedido antes de finalizá-lo.']);
            }

            $expectedVolumeIds = $lockedOrder->items()->pluck('stock_offer_volume_id');
            $reservedVolumes = $lockedOrder->reservedVolumes()->whereKey($expectedVolumeIds)->lockForUpdate()->get();

            if ($reservedVolumes->count() !== $expectedVolumeIds->count()) {
                throw ValidationException::withMessages(['order' => 'A reserva dos sacos mudou. Revise o pedido antes de finalizar.']);
            }

            $reservedVolumes->each->update(['current_order_id' => null, 'consumed_at' => now()]);
            $lockedOrder->update(['status' => OrderStatus::Completed, 'completed_at' => now()]);

            return $lockedOrder;
        });
    }
}
