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

class OpenInitialStock
{
    public function __construct(
        private readonly StockMovementRecorder $recorder,
    ) {}

    /**
     * Register the current untracked sacks as the initial opening balance.
     *
     * @param  array<int, mixed>|null  $volumeIds
     */
    public function handle(?array $volumeIds, string $idempotencyKey, ?User $actor = null): StockMovement
    {
        $idempotencyKey = Str::squish($idempotencyKey);

        if ($idempotencyKey === '') {
            throw ValidationException::withMessages([
                'idempotency_key' => 'Informe uma chave para a abertura inicial.',
            ]);
        }

        $normalizedIds = $this->normalizeIds($volumeIds);
        $payloadHash = hash('sha256', json_encode([
            'volume_ids' => $normalizedIds?->all(),
            'source' => StockMovementSource::Opening->value,
        ], JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($normalizedIds, $idempotencyKey, $payloadHash, $actor): StockMovement {
            $existing = $this->recorder->findIdempotent($idempotencyKey, $payloadHash);

            if ($existing !== null) {
                return $existing;
            }

            $query = StockOfferVolume::query()
                ->where('total_quantity', '>', 0)
                ->whereNull('current_order_id')
                ->whereNull('consumed_at')
                ->whereDoesntHave('stockMovementItems')
                ->with(['items', 'offer.product.category'])
                ->orderBy('id')
                ->lockForUpdate();

            if ($normalizedIds !== null) {
                $query->whereIn('id', $normalizedIds);
            }

            $volumes = $query->get();

            if ($normalizedIds !== null && $volumes->count() !== $normalizedIds->count()) {
                throw ValidationException::withMessages([
                    'volume_ids' => 'Um ou mais sacos não estão disponíveis para a abertura inicial.',
                ]);
            }

            if ($volumes->isEmpty()) {
                throw ValidationException::withMessages([
                    'volume_ids' => 'Não há sacos físicos não rastreados para abrir.',
                ]);
            }

            foreach ($volumes as $volume) {
                $this->recorder->ensureVolumeCode($volume);
            }

            $resultingStates = $volumes->mapWithKeys(fn (StockOfferVolume $volume): array => [
                $volume->getKey() => $this->recorder->snapshot($volume),
            ])->all();

            return $this->recorder->handle(
                StockMovementType::In,
                StockMovementSource::Opening,
                $volumes,
                $actor,
                null,
                'Abertura inicial do estoque físico.',
                null,
                $idempotencyKey,
                $payloadHash,
                [],
                $resultingStates,
            );
        });
    }

    /**
     * @param  array<int, mixed>|null  $volumeIds
     * @return Collection<int, int<1, max>>|null
     */
    private function normalizeIds(?array $volumeIds): ?Collection
    {
        if ($volumeIds === null) {
            return null;
        }

        $normalized = [];

        foreach ($volumeIds as $id) {
            if (is_int($id) && $id > 0) {
                $normalized[] = $id;
            } elseif (is_string($id) && ctype_digit($id) && (int) $id > 0) {
                $normalized[] = (int) $id;
            }
        }

        return collect($normalized)
            ->unique()
            ->sort()
            ->values();
    }
}
