<?php

namespace App\Actions\Stock;

use App\Enums\StockMovementSource;
use App\Enums\StockMovementType;
use App\Models\StockMovement;
use App\Models\StockOfferVolume;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CreateManualStockOut
{
    public function __construct(
        private readonly StockMovementRecorder $recorder,
    ) {}

    /** @param array<string, mixed> $data */
    public function handle(array $data, ?User $actor = null): StockMovement
    {
        if ($actor === null) {
            throw ValidationException::withMessages(['actor' => 'Um usuário da equipe precisa registrar a saída.']);
        }

        $volumeIds = $this->volumeIds($data['volume_ids'] ?? []);
        $reason = $this->text($data['reason'] ?? null);
        $notes = $this->text($data['notes'] ?? null);
        $idempotencyKey = $this->text($data['idempotency_key'] ?? null);

        if ($reason === null) {
            throw ValidationException::withMessages([
                'reason' => 'Informe o motivo da saída.',
            ]);
        }

        if ($idempotencyKey === null) {
            throw ValidationException::withMessages([
                'idempotency_key' => 'Informe uma chave para evitar duplicidade.',
            ]);
        }

        $payloadHash = hash('sha256', json_encode([
            'volume_ids' => $volumeIds->all(),
            'reason' => $reason,
            'notes' => $notes,
        ], JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($volumeIds, $reason, $notes, $idempotencyKey, $payloadHash, $actor): StockMovement {
            $existing = $this->recorder->findIdempotent($idempotencyKey, $payloadHash);

            if ($existing !== null) {
                return $existing;
            }

            $volumes = StockOfferVolume::query()
                ->whereIn('id', $volumeIds)
                ->with(['items', 'offer.product.category'])
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            if ($volumes->count() !== $volumeIds->count()) {
                throw ValidationException::withMessages([
                    'volume_ids' => 'Um ou mais sacos não existem mais.',
                ]);
            }

            if ($volumes->contains(fn (StockOfferVolume $volume): bool => $volume->current_order_id !== null
                || $volume->consumed_at !== null
                || $volume->total_quantity <= 0)) {
                throw ValidationException::withMessages([
                    'volume_ids' => 'Só é possível dar saída em sacos disponíveis, não reservados e não consumidos.',
                ]);
            }

            $previousStates = $volumes->mapWithKeys(fn (StockOfferVolume $volume): array => [
                $volume->getKey() => $this->recorder->snapshot($volume),
            ])->all();
            $consumedAt = now();

            $volumes->each(function (StockOfferVolume $volume) use ($consumedAt): void {
                $volume->update(['consumed_at' => $consumedAt]);
            });

            $resultingStates = $volumes->mapWithKeys(fn (StockOfferVolume $volume): array => [
                $volume->getKey() => $this->recorder->snapshot($volume),
            ])->all();

            return $this->recorder->handle(
                StockMovementType::Out,
                StockMovementSource::Manual,
                $volumes,
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

    /** @return Collection<int, int> */
    private function volumeIds(mixed $value): Collection
    {
        if (! is_array($value)) {
            throw ValidationException::withMessages(['volume_ids' => 'Selecione pelo menos um saco.']);
        }

        $ids = collect($value)
            ->filter(fn (mixed $id): bool => is_numeric($id) && (int) $id > 0)
            ->map(fn (mixed $id): int => (int) $id)
            ->unique()
            ->sort()
            ->values();

        if ($ids->isEmpty()) {
            throw ValidationException::withMessages(['volume_ids' => 'Selecione pelo menos um saco.']);
        }

        return $ids;
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
