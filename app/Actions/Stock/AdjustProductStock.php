<?php

namespace App\Actions\Stock;

use App\Enums\StockMovementSource;
use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\StockOfferVolume;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AdjustProductStock
{
    public function __construct(private readonly StockMovementRecorder $recorder, private readonly StockRecount $recount) {}

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
            'expected_version' => $data['expected_version'] ?? null,
        ], JSON_THROW_ON_ERROR));

        return StockMutation::run(function () use ($product, $volumeId, $items, $totalQuantity, $reason, $notes, $idempotencyKey, $payloadHash, $actor, $data): StockMovement {
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
                throw ValidationException::withMessages(['volume_id' => 'Selecione um saco disponível, sem reserva e sem retirada registrada.']);
            }
            if ($volume->stock_version !== (int) ($data['expected_version'] ?? 0)) {
                throw ValidationException::withMessages(['volume_id' => 'Este saco mudou desde o início da contagem. Atualize a página e confira novamente.']);
            }

            $previousStates = [$volume->getKey() => $this->recorder->snapshot($volume)];
            $normalized = $this->recount->normalize($volume, $items, $totalQuantity);
            foreach ($normalized['items'] as $index => $item) {
                $attributes = ['size' => $item['size'], 'is_active' => $item['is_active'], 'quantity' => $item['quantity']];
                if ($item['id'] === null) {
                    $volume->items()->create([...$attributes, 'sort_order' => $index]);
                } else {
                    $volume->items->firstWhere('id', $item['id'])->update($attributes);
                }
            }
            $nextTotalQuantity = $normalized['total_quantity'];
            $volume->update(['total_quantity' => $nextTotalQuantity]);
            $volume->load(['items', 'offer.product.category']);
            $resultingStates = [$volume->getKey() => $this->recorder->snapshot($volume)];

            if ($previousStates[$volume->getKey()] === $resultingStates[$volume->getKey()]) {
                throw ValidationException::withMessages(['items' => 'Altere pelo menos um tamanho ou uma quantidade antes de salvar.']);
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
