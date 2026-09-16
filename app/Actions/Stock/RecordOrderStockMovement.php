<?php

namespace App\Actions\Stock;

use App\Enums\StockMovementSource;
use App\Enums\StockMovementType;
use App\Models\Order;
use App\Models\StockMovement;
use App\Models\StockOfferVolume;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RecordOrderStockMovement
{
    public function __construct(
        private readonly StockMovementRecorder $recorder,
    ) {}

    /**
     * Consume the reserved sacks and record the order's single stock exit.
     *
     * @param  Collection<int, StockOfferVolume>  $volumes
     */
    public function handle(Order $order, Collection $volumes, ?User $actor = null): StockMovement
    {
        $idempotencyKey = 'order:'.$order->getKey().':completion';
        $volumeIds = $volumes
            ->pluck('id')
            ->map(fn (mixed $id): int => (int) $id)
            ->sort()
            ->values()
            ->all();
        $payloadHash = hash('sha256', json_encode([
            'order_id' => $order->getKey(),
            'volume_ids' => $volumeIds,
        ], JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($order, $volumes, $actor, $idempotencyKey, $payloadHash): StockMovement {
            $existing = $this->recorder->findIdempotent($idempotencyKey, $payloadHash);

            if ($existing !== null) {
                return $existing;
            }

            if ($volumes->isEmpty() || $volumes->contains(fn (StockOfferVolume $volume): bool => $volume->current_order_id !== $order->getKey()
                || $volume->consumed_at !== null
                || $volume->total_quantity <= 0)) {
                throw ValidationException::withMessages([
                    'order' => 'A reserva dos sacos não está mais disponível. Atualize o pedido e tente novamente.',
                ]);
            }

            $previousStates = $volumes->mapWithKeys(fn (StockOfferVolume $volume): array => [
                $volume->getKey() => $this->recorder->snapshot($volume),
            ])->all();
            $consumedAt = now();

            $volumes->each(function (StockOfferVolume $volume) use ($consumedAt): void {
                $volume->update([
                    'current_order_id' => null,
                    'consumed_at' => $consumedAt,
                ]);
            });

            $resultingStates = $volumes->mapWithKeys(fn (StockOfferVolume $volume): array => [
                $volume->getKey() => $this->recorder->snapshot($volume),
            ])->all();

            return $this->recorder->handle(
                StockMovementType::Out,
                StockMovementSource::Order,
                $volumes,
                $actor,
                $order,
                'Pedido '.$order->code.' finalizado.',
                null,
                $idempotencyKey,
                $payloadHash,
                $previousStates,
                $resultingStates,
            );
        });
    }
}
