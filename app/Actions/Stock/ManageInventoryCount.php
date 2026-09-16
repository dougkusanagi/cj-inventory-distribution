<?php

namespace App\Actions\Stock;

use App\Models\InventoryCount;
use App\Models\InventoryCountItem;
use App\Models\StockOfferVolume;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class ManageInventoryCount
{
    public function __construct(private readonly StockRecount $recount, private readonly AdjustProductStock $adjust) {}

    /** @param array{volume_ids: array<int, int>, reason: string, idempotency_key: string} $data */
    public function open(array $data, User $actor): InventoryCount
    {
        return StockMutation::run(function () use ($data, $actor): InventoryCount {
            $ids = collect($data['volume_ids'])->map(fn ($id): int => (int) $id)->sort()->values();
            $hash = hash('sha256', json_encode([$ids->all(), $data['reason']], JSON_THROW_ON_ERROR));
            $existing = InventoryCount::where('idempotency_key', $data['idempotency_key'])->first();
            if ($existing) {
                if ($existing->payload_hash !== $hash) {
                    throw ValidationException::withMessages(['volume_ids' => 'Esta solicitação já foi usada para outro balanço.']);
                }

                return $existing;
            }
            $volumes = StockOfferVolume::whereIn('id', $ids)->with(['items', 'offer.product'])->get();
            if ($volumes->count() !== $ids->count()) {
                throw ValidationException::withMessages(['volume_ids' => 'Um saco selecionado não existe mais. Atualize a seleção.']);
            }
            foreach ($volumes as $volume) {
                $this->available($volume);
            }
            $count = InventoryCount::create(['reason' => $data['reason'], 'actor_id' => $actor->id,
                'idempotency_key' => $data['idempotency_key'], 'payload_hash' => $hash]);
            foreach ($volumes as $volume) {
                $count->items()->create(['stock_offer_volume_id' => $volume->id,
                    'expected_version' => $volume->stock_version, 'snapshot' => $this->snapshot($volume)]);
            }

            return $count;
        });
    }

    /** @param array<string, mixed> $data */
    public function save(InventoryCount $count, int $itemId, array $data): void
    {
        StockMutation::run(function () use ($count, $itemId, $data): void {
            $this->editable($count, (int) $data['version']);
            $item = $count->items()->findOrFail($itemId);
            $volume = $item->volume()->with(['items', 'offer.product'])->firstOrFail();
            $this->unchanged($item, $volume);
            $normalized = $this->recount->normalize($volume, $data['items'], $data['total_quantity'] ?? null);
            $item->update(['counted_items' => $normalized['items'], 'counted_total' => $normalized['total_quantity']]);
            $count->increment('version');
        });
    }

    public function refreshItem(InventoryCount $count, int $itemId, int $version): void
    {
        StockMutation::run(function () use ($count, $itemId, $version): void {
            $this->editable($count, $version);
            $item = $count->items()->findOrFail($itemId);
            $volume = $item->volume()->with(['items', 'offer.product'])->firstOrFail();
            $this->available($volume);
            $item->update(['expected_version' => $volume->stock_version, 'snapshot' => $this->snapshot($volume),
                'counted_items' => null, 'counted_total' => null]);
            $count->increment('version');
        });
    }

    public function confirm(InventoryCount $count, int $version, User $actor): void
    {
        StockMutation::run(function () use ($count, $version, $actor): void {
            $count->refresh();
            if ($count->status === 'confirmed') {
                return;
            }
            $this->editable($count, $version);
            $items = $count->items()->with(['volume.items', 'volume.offer.product'])->orderBy('stock_offer_volume_id')->get();
            foreach ($items as $item) {
                if ($item->counted_total === null || $item->counted_items === null) {
                    throw ValidationException::withMessages(['inventory' => 'Conte todos os sacos antes de confirmar o balanço.']);
                }
                $this->unchanged($item, $item->volume);
            }
            foreach ($items as $item) {
                $volume = $item->volume;
                $normalized = $this->recount->normalize($volume, $item->counted_items, $item->counted_total);
                $same = $normalized['total_quantity'] === $volume->total_quantity
                    && $normalized['items'] === $this->snapshot($volume)['items'];
                if (! $same) {
                    $movement = $this->adjust->handle($volume->offer->product, [
                        'volume_id' => $volume->id, 'expected_version' => $item->expected_version,
                        'items' => $item->counted_items, 'total_quantity' => $item->counted_total,
                        'reason' => 'Balanço #'.$count->id.': '.$count->reason,
                        'idempotency_key' => 'inventory:'.$count->id.':'.$item->id,
                    ], $actor);
                    $item->update(['stock_movement_id' => $movement->id]);
                }
            }
            $count->update(['status' => 'confirmed', 'confirmed_by' => $actor->id,
                'confirmed_at' => now(), 'version' => $count->version + 1]);
        });
    }

    public function cancel(InventoryCount $count, int $version): void
    {
        StockMutation::run(function () use ($count, $version): void {
            $this->editable($count, $version);
            $count->update(['status' => 'canceled', 'version' => $count->version + 1]);
        });
    }

    private function editable(InventoryCount $count, int $version): void
    {
        $count->refresh();
        if ($count->status !== 'draft' || $count->version !== $version) {
            throw ValidationException::withMessages(['inventory' => 'Este balanço mudou ou já foi encerrado. Atualize a página.']);
        }
    }

    private function available(StockOfferVolume $volume): void
    {
        if ($volume->trashed() || $volume->current_order_id !== null || $volume->consumed_at !== null
            || $volume->offer->trashed() || $volume->offer->product->trashed()) {
            throw ValidationException::withMessages(['inventory' => 'O saco '.$volume->id.' está reservado, consumido ou excluído. Regularize-o antes de contar.']);
        }
    }

    private function unchanged(InventoryCountItem $item, StockOfferVolume $volume): void
    {
        $this->available($volume);
        if ($item->expected_version !== $volume->stock_version) {
            throw ValidationException::withMessages(['inventory' => 'O saco '.$volume->id.' mudou durante o balanço. Atualize sua referência e faça uma nova contagem.']);
        }
    }

    /** @return array<string, mixed> */
    private function snapshot(StockOfferVolume $volume): array
    {
        return ['code' => $volume->code ?? 'SC-'.str_pad((string) $volume->id, 6, '0', STR_PAD_LEFT),
            'product' => $volume->offer->product->name, 'total_quantity' => $volume->total_quantity,
            'items' => $volume->items->map(fn ($item): array => ['id' => $item->id, 'size' => $item->size,
                'is_active' => $item->is_active, 'quantity' => $item->quantity])->all()];
    }
}
