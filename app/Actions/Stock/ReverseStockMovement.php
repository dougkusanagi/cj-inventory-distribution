<?php

namespace App\Actions\Stock;

use App\Enums\StockMovementSource;
use App\Enums\StockMovementType;
use App\Models\StockMovement;
use App\Models\StockMovementItem;
use App\Models\StockOfferVolume;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ReverseStockMovement
{
    public function __construct(
        private readonly StockMovementRecorder $recorder,
    ) {}

    public function handle(StockMovement $movement, string $reason, ?User $actor = null): StockMovement
    {
        if ($actor === null) {
            throw ValidationException::withMessages(['actor' => 'Um usuário da equipe precisa registrar o estorno.']);
        }

        $reason = Str::squish($reason);

        if ($reason === '') {
            throw ValidationException::withMessages(['reason' => 'Informe o motivo do estorno.']);
        }

        $idempotencyKey = 'reversal:'.$movement->getKey();
        $payloadHash = hash('sha256', json_encode([
            'movement_id' => $movement->getKey(),
            'reason' => $reason,
        ], JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($movement, $reason, $actor, $idempotencyKey, $payloadHash): StockMovement {
            $original = StockMovement::query()
                ->whereKey($movement->getKey())
                ->with('items')
                ->lockForUpdate()
                ->firstOrFail();
            $existing = $this->recorder->findIdempotent($idempotencyKey, $payloadHash);

            if ($existing !== null) {
                return $existing;
            }

            if ($original->source !== StockMovementSource::Manual) {
                throw ValidationException::withMessages([
                    'movement' => 'Esta movimentação não pode ser estornada porque foi gerada automaticamente.',
                ]);
            }

            if ($original->reversals()->exists()) {
                throw ValidationException::withMessages([
                    'movement' => 'Esta movimentação já possui um estorno.',
                ]);
            }

            $volumeIds = $original->items->pluck('stock_offer_volume_id')->filter()->map(fn (mixed $id): int => (int) $id);
            $volumes = StockOfferVolume::withTrashed()
                ->whereIn('id', $volumeIds)
                ->with(['items', 'offer.product.category'])
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            if ($volumeIds->isEmpty() || $volumes->count() !== $volumeIds->unique()->count()) {
                throw ValidationException::withMessages([
                    'movement' => 'Os sacos desta movimentação não estão mais disponíveis para estorno.',
                ]);
            }

            if ($this->hasLaterMovement($original, $volumeIds->all())) {
                throw ValidationException::withMessages([
                    'movement' => 'Esta movimentação não pode ser estornada porque os mesmos sacos já foram movimentados depois.',
                ]);
            }

            $previousStates = $volumes->mapWithKeys(fn (StockOfferVolume $volume): array => [
                $volume->getKey() => $this->recorder->snapshot($volume),
            ])->all();

            foreach ($volumes as $volume) {
                if ($original->type === StockMovementType::Out) {
                    $this->restoreOutgoingVolume($volume);
                } else {
                    $this->consumeIncomingVolume($volume);
                }
            }

            $resultingStates = $volumes->mapWithKeys(fn (StockOfferVolume $volume): array => [
                $volume->getKey() => $this->recorder->snapshot($volume),
            ])->all();

            return $this->recorder->handle(
                $original->type === StockMovementType::Out
                    ? StockMovementType::In
                    : StockMovementType::Out,
                StockMovementSource::Manual,
                $volumes,
                $actor,
                null,
                $reason,
                'Estorno da movimentação #'.$original->getKey().'.',
                $idempotencyKey,
                $payloadHash,
                $previousStates,
                $resultingStates,
                $original,
            );
        });
    }

    /** @param array<int, int> $volumeIds */
    private function hasLaterMovement(StockMovement $movement, array $volumeIds): bool
    {
        return StockMovementItem::query()
            ->whereIn('stock_offer_volume_id', $volumeIds)
            ->whereHas('movement', function (Builder $query) use ($movement): void {
                $query->where(function (Builder $query) use ($movement): void {
                    $query->where('occurred_at', '>', $movement->occurred_at)
                        ->orWhere(function (Builder $query) use ($movement): void {
                            $query->where('occurred_at', $movement->occurred_at)
                                ->where('id', '>', $movement->getKey());
                        });
                });
            })
            ->exists();
    }

    private function restoreOutgoingVolume(StockOfferVolume $volume): void
    {
        if ($volume->trashed() || $volume->current_order_id !== null || $volume->consumed_at === null) {
            throw ValidationException::withMessages([
                'movement' => 'Esta saída não pode ser estornada porque o saco já foi alterado.',
            ]);
        }

        $volume->update(['consumed_at' => null]);
    }

    private function consumeIncomingVolume(StockOfferVolume $volume): void
    {
        if ($volume->trashed()
            || $volume->current_order_id !== null
            || $volume->consumed_at !== null
            || $volume->orderItems()->withTrashed()->exists()) {
            throw ValidationException::withMessages([
                'movement' => 'Esta entrada não pode ser estornada porque o saco já foi reservado, retirado ou usado em outro registro.',
            ]);
        }

        $volume->update(['consumed_at' => now()]);
    }
}
