<?php

namespace App\Actions\Orders;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Validation\ValidationException;

class UpdateOrder
{
    /** @param array<string, mixed> $data */
    public function handle(Order $order, array $data): Order
    {
        if ($order->status !== OrderStatus::Pending) {
            throw ValidationException::withMessages([
                'order' => 'Somente pedidos pendentes podem ser editados.',
            ]);
        }

        $order->update([
            'store_name' => $data['store_name'],
            'requester_name' => $data['requester_name'],
            'whatsapp' => $data['whatsapp'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);

        return $order;
    }
}
