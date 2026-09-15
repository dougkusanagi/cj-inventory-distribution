<?php

namespace App\Actions\Stock;

use App\Enums\StockMovementSource;
use App\Enums\StockMovementType;
use App\Models\Order;
use App\Models\StockMovement;
use App\Models\StockOfferVolume;
use App\Models\StockOfferVolumeItem;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class StockMovementRecorder
{
    /**
     * Record an immutable movement and one snapshot item for every physical sack.
     *
     * @param  Collection<int, StockOfferVolume>  $volumes
     * @param  array<int, array<string, mixed>|null>  $previousStates
     * @param  array<int, array<string, mixed>|null>  $resultingStates
     */
    public function handle(
        StockMovementType $type,
        StockMovementSource $source,
        Collection $volumes,
        ?User $actor = null,
        ?Order $order = null,
        ?string $reason = null,
        ?string $notes = null,
        ?string $idempotencyKey = null,
        ?string $payloadHash = null,
        array $previousStates = [],
        array $resultingStates = [],
        ?StockMovement $reversalOf = null,
    ): StockMovement {
        if ($volumes->isEmpty()) {
            throw ValidationException::withMessages([
                'volume_ids' => 'Selecione pelo menos um saco para movimentar.',
            ]);
        }

        $existing = $this->findIdempotent($idempotencyKey, $payloadHash);

        if ($existing !== null) {
            return $existing;
        }

        $volumes->each(fn (StockOfferVolume $volume): string => $this->ensureVolumeCode($volume));

        $movement = StockMovement::create([
            'type' => $type,
            'source' => $source,
            'actor_id' => $actor?->getKey(),
            'order_id' => $order?->getKey(),
            'reversal_of_id' => $reversalOf?->getKey(),
            'reason' => $reason,
            'notes' => $notes,
            'idempotency_key' => $idempotencyKey,
            'payload_hash' => $payloadHash,
            'occurred_at' => now(),
        ]);

        foreach ($volumes as $volume) {
            $movement->items()->create($this->itemAttributes(
                $volume,
                $previousStates[$volume->getKey()] ?? null,
                $resultingStates[$volume->getKey()] ?? null,
            ));
        }

        return $movement->load('items');
    }

    public function findIdempotent(?string $idempotencyKey, ?string $payloadHash = null): ?StockMovement
    {
        if ($idempotencyKey === null) {
            return null;
        }

        $existing = StockMovement::query()
            ->where('idempotency_key', $idempotencyKey)
            ->with('items')
            ->first();

        if ($existing !== null && $payloadHash !== null && $existing->payload_hash !== $payloadHash) {
            throw ValidationException::withMessages([
                'idempotency_key' => 'A chave de idempotência já foi usada com outra movimentação.',
            ]);
        }

        return $existing;
    }

    /** @return array<string, mixed> */
    public function snapshot(StockOfferVolume $volume): array
    {
        $offer = $volume->offer;
        $product = $offer?->product;

        return [
            'volume_id' => $volume->getKey(),
            'volume_code' => $volume->code ?? $this->volumeCode($volume),
            'total_quantity' => (int) $volume->total_quantity,
            'current_order_id' => $volume->current_order_id,
            'consumed_at' => $volume->consumed_at?->toISOString(),
            'sizes' => $volume->items
                ->where('is_active', true)
                ->map(fn (StockOfferVolumeItem $item): array => [
                    'size' => $item->size,
                    'quantity' => $item->quantity,
                ])
                ->values()
                ->all(),
            'product_id' => $product?->getKey(),
            'product_code' => $product?->code,
            'offer_id' => $offer?->getKey(),
            'offer_type' => $offer?->type?->value,
        ];
    }

    public function ensureVolumeCode(StockOfferVolume $volume): string
    {
        $code = $volume->code ?? $this->volumeCode($volume);

        if ($volume->code !== $code) {
            $volume->updateQuietly(['code' => $code]);
        }

        return $code;
    }

    /**
     * @param  array<string, mixed>|null  $previousState
     * @param  array<string, mixed>|null  $resultingState
     * @return array<string, mixed>
     */
    private function itemAttributes(
        StockOfferVolume $volume,
        ?array $previousState,
        ?array $resultingState,
    ): array {
        $offer = $volume->offer;
        $product = $offer?->product;

        return [
            'stock_offer_volume_id' => $volume->getKey(),
            'product_id' => $product?->getKey(),
            'stock_offer_id' => $offer?->getKey(),
            'volume_code_snapshot' => $volume->code ?? $this->volumeCode($volume),
            'product_code_snapshot' => $product?->code,
            'product_name_snapshot' => $product?->name,
            'product_model_snapshot' => $product?->model,
            'category_snapshot' => $product?->category?->name,
            'line_snapshot' => $product?->line?->value,
            'offer_type_snapshot' => $offer?->type?->value,
            'total_quantity' => (int) $volume->total_quantity,
            'size_grid_snapshot' => $volume->items
                ->where('is_active', true)
                ->map(fn (StockOfferVolumeItem $item): array => [
                    'size' => $item->size,
                    'quantity' => $item->quantity,
                ])
                ->values()
                ->all(),
            'previous_state' => $previousState,
            'resulting_state' => $resultingState,
        ];
    }

    private function volumeCode(StockOfferVolume $volume): string
    {
        return 'SC-'.str_pad((string) $volume->getKey(), 6, '0', STR_PAD_LEFT);
    }
}
