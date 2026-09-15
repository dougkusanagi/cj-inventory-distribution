<?php

namespace App\Actions\Stock;

use App\Enums\StockMovementSource;
use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\StockOfferVolume;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AdjustProductStock
{
    public function __construct(private readonly StockMovementRecorder $recorder) {}

    /** @param array<string, mixed> $data */
    public function handle(Product $product, array $data, ?User $actor = null): StockMovement
    {
        if ($actor === null) {
            throw ValidationException::withMessages(['actor' => 'Um usuário da equipe precisa registrar o ajuste.']);
        }

        $reason = $this->text($data['reason'] ?? null);
        $idempotencyKey = $this->text($data['idempotency_key'] ?? null);

        if ($reason === null || $idempotencyKey === null) {
            throw ValidationException::withMessages(['reason' => 'Informe o motivo do ajuste.']);
        }

        $volumeId = (int) $data['volume_id'];
        $items = $data['items'] ?? null;

        if (! is_array($items)) {
            throw ValidationException::withMessages(['items' => 'Informe os tamanhos do saco.']);
        }
        $totalQuantity = $data['total_quantity'] ?? null;
        $notes = $this->text($data['notes'] ?? null);
        $payloadHash = hash('sha256', json_encode([
            'product_id' => $product->getKey(),
            'volume_id' => $volumeId,
            'items' => $items,
            'total_quantity' => $totalQuantity,
            'reason' => $reason,
            'notes' => $notes,
        ], JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($product, $volumeId, $items, $totalQuantity, $reason, $notes, $idempotencyKey, $payloadHash, $actor): StockMovement {
            $existing = $this->recorder->findIdempotent($idempotencyKey, $payloadHash);

            if ($existing !== null) {
                return $existing;
            }

            $volume = StockOfferVolume::query()
                ->whereKey($volumeId)
                ->whereHas('offer', fn ($query) => $query->where('product_id', $product->getKey()))
                ->with(['items', 'offer.product.category'])
                ->lockForUpdate()
                ->first();

            if ($volume === null || $volume->current_order_id !== null || $volume->consumed_at !== null) {
                throw ValidationException::withMessages(['volume_id' => 'Selecione um saco disponível, sem reserva ou consumo.']);
            }

            $previousStates = [$volume->getKey() => $this->recorder->snapshot($volume)];
            $itemsById = collect($items)->keyBy(fn (array $item): int => (int) $item['id']);

            if ($itemsById->count() !== $volume->items->count() || $volume->items->contains(fn ($item): bool => ! $itemsById->has($item->getKey()))) {
                throw ValidationException::withMessages(['items' => 'Os tamanhos informados não pertencem a este saco.']);
            }

            foreach ($volume->items as $item) {
                /** @var array{id: int, is_active: bool, quantity: int|null} $updatedItem */
                $updatedItem = $itemsById->get($item->getKey());
                $isActive = filter_var($updatedItem['is_active'], FILTER_VALIDATE_BOOLEAN);
                $quantity = $isActive && $updatedItem['quantity'] !== null ? (int) $updatedItem['quantity'] : null;
                $item->update(['is_active' => $isActive, 'quantity' => $quantity]);
            }

            $hasKnownQuantity = $volume->items->contains(fn ($item): bool => $item->is_active && $item->quantity !== null);
            $nextTotalQuantity = $hasKnownQuantity
                ? (int) $volume->items->where('is_active', true)->sum('quantity')
                : (is_numeric($totalQuantity) ? (int) $totalQuantity : null);

            if ($nextTotalQuantity === null) {
                throw ValidationException::withMessages(['total_quantity' => 'Informe o total quando não houver quantidades por tamanho.']);
            }

            $volume->update(['total_quantity' => $nextTotalQuantity]);
            $volume->load(['items', 'offer.product.category']);
            $resultingStates = [$volume->getKey() => $this->recorder->snapshot($volume)];

            if ($previousStates[$volume->getKey()] === $resultingStates[$volume->getKey()]) {
                throw ValidationException::withMessages(['items' => 'Informe ao menos uma alteração na recontagem.']);
            }

            $previousTotalQuantity = (int) $previousStates[$volume->getKey()]['total_quantity'];
            $type = $nextTotalQuantity > $previousTotalQuantity
                ? StockMovementType::In
                : ($nextTotalQuantity < $previousTotalQuantity ? StockMovementType::Out : StockMovementType::Adjustment);

            return $this->recorder->handle(
                $type,
                StockMovementSource::Adjustment,
                collect([$volume]),
                $actor,
                null,
                $reason,
                $notes,
                $idempotencyKey,
                $payloadHash,
                $previousStates,
                $resultingStates,
            );
        });
    }

    private function text(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = Str::squish($value);

        return $value === '' ? null : $value;
    }
}
