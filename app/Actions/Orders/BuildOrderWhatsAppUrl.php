<?php

namespace App\Actions\Orders;

use App\Models\Order;
use App\Models\OrderItem;

class BuildOrderWhatsAppUrl
{
    public function handle(Order $order, string $destination): string
    {
        $order->loadMissing('items');
        $lines = [
            "*Pedido {$order->code}*",
            "Loja: {$order->store_name}",
            "Responsável: {$order->requester_name}",
        ];

        if ($order->whatsapp !== null) {
            $lines[] = "WhatsApp da loja: {$order->whatsapp}";
        }

        $lines[] = '';
        $lines[] = '*Sacos solicitados*';

        foreach ($order->items as $item) {
            $lines[] = $this->itemLine($item);
        }

        $lines[] = '';
        $sackCount = $order->items->count();
        $sackLabel = $sackCount === 1 ? 'saco' : 'sacos';
        $lines[] = "Total: {$sackCount} {$sackLabel} · {$order->items->sum('total_quantity')} peças";

        if ($order->notes !== null) {
            $lines[] = '';
            $lines[] = "Observações: {$order->notes}";
        }

        return 'https://wa.me/'.$destination.'?text='.rawurlencode(implode("\n", $lines));
    }

    private function itemLine(OrderItem $item): string
    {
        $product = "{$item->product_code_snapshot} · {$item->product_name_snapshot}";

        if ($item->product_model_snapshot !== null) {
            $product .= " · Modelo {$item->product_model_snapshot}";
        }

        $sizes = collect($item->size_grid)
            ->map(fn (array $size): string => $size['quantity'] === null
                ? (string) $size['size']
                : "{$size['size']}: {$size['quantity']}")
            ->implode(', ');

        return "- {$product} — {$item->volume_code_snapshot} · {$item->total_quantity} peças · Tamanhos: {$sizes}";
    }
}
