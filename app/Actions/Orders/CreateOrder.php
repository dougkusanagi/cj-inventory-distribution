<?php

namespace App\Actions\Orders;

use App\Enums\OrderStatus;
use App\Enums\StockOfferType;
use App\Models\Order;
use App\Models\StockOfferVolume;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CreateOrder
{
    /** @param array<string, mixed> $data */
    public function handle(array $data): Order
    {
        return DB::transaction(function () use ($data): Order {
            $volumeIds = $this->volumeIds($data);
            $volumes = StockOfferVolume::query()
                ->whereKey($volumeIds)
                ->with(['items', 'offer.product.category'])
                ->lockForUpdate()
                ->get();

            if ($volumes->count() !== $volumeIds->count() || $volumes->contains(fn (StockOfferVolume $volume): bool => ! $this->isAvailable($volume))) {
                throw ValidationException::withMessages([
                    'volume_ids' => 'Um ou mais sacos não estão mais disponíveis. Atualize a seleção.',
                ]);
            }

            $order = Order::create([
                'code' => 'P-'.Str::random(18),
                'store_name' => $data['store_name'],
                'requester_name' => $data['requester_name'],
                'whatsapp' => $data['whatsapp'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => OrderStatus::Pending,
                'submitted_at' => now(),
            ]);
            $order->updateQuietly(['code' => 'PED-'.str_pad((string) $order->id, 6, '0', STR_PAD_LEFT)]);

            foreach ($volumes as $volume) {
                $volumeCode = $volume->code ?? 'SC-'.str_pad((string) $volume->id, 6, '0', STR_PAD_LEFT);
                $volume->update(['code' => $volumeCode, 'current_order_id' => $order->id]);
                $product = $volume->offer->product;

                $order->items()->create([
                    'stock_offer_volume_id' => $volume->id,
                    'product_id' => $product->id,
                    'product_code_snapshot' => $product->code,
                    'product_name_snapshot' => $product->name,
                    'product_model_snapshot' => $product->model,
                    'category_snapshot' => $product->category?->name,
                    'line_snapshot' => $product->line?->value,
                    'offer_type_snapshot' => $volume->offer->type->value,
                    'volume_code_snapshot' => $volumeCode,
                    'total_quantity' => $volume->total_quantity,
                    'size_grid' => $volume->items->where('is_active', true)->map(fn ($item): array => [
                        'size' => $item->size,
                        'quantity' => $item->quantity,
                    ])->values()->all(),
                ]);
            }

            return $order->load('items');
        });
    }

    private function isAvailable(StockOfferVolume $volume): bool
    {
        return $volume->current_order_id === null
            && $volume->consumed_at === null
            && $volume->total_quantity > 0
            && $volume->offer->is_active
            && $volume->offer->type !== StockOfferType::NewGrade
            && $volume->offer->product->is_active;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return Collection<int, int>
     */
    private function volumeIds(array $data): Collection
    {
        $volumeIds = $data['volume_ids'] ?? [];

        if (! is_array($volumeIds)) {
            throw ValidationException::withMessages([
                'volume_ids' => 'Selecione pelo menos um saco.',
            ]);
        }

        return collect($volumeIds)
            ->filter(fn (mixed $id): bool => is_numeric($id))
            ->map(fn (mixed $id): int => (int) $id)
            ->sort()
            ->values();
    }
}
