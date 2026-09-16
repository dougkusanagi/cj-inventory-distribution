<?php

namespace App\Actions\Stock;

use App\Enums\StockMovementSource;
use App\Enums\StockMovementType;
use App\Enums\StockOfferType;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\StockOffer;
use App\Models\StockOfferVolume;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CreateStockEntry
{
    public function __construct(
        private readonly StockMovementRecorder $recorder,
    ) {}

    /** @param array<string, mixed> $data */
    public function handle(Product $product, array $data, ?User $actor = null): StockMovement
    {
        if ($actor === null) {
            throw ValidationException::withMessages([
                'actor' => 'Um usuário da equipe precisa registrar a entrada.',
            ]);
        }

        $type = $this->movementType($data['stock_offer_type'] ?? null);
        $volumes = $this->normalizeVolumes($data['stock_volumes'] ?? []);
        $notes = $this->normalizeText($data['notes'] ?? null);
        $reason = $this->normalizeText($data['reason'] ?? null);
        $idempotencyKey = $this->normalizeText($data['idempotency_key'] ?? null);

        if ($reason === null) {
            throw ValidationException::withMessages([
                'reason' => 'Informe o motivo da entrada.',
            ]);
        }

        if ($idempotencyKey === null) {
            throw ValidationException::withMessages([
                'idempotency_key' => 'Não foi possível registrar a entrada. Atualize a página e tente novamente.',
            ]);
        }

        $payloadHash = $this->payloadHash($product, $type, $volumes, $notes, $reason);

        return DB::transaction(function () use ($product, $type, $volumes, $notes, $reason, $idempotencyKey, $payloadHash, $actor): StockMovement {
            $existing = $this->recorder->findIdempotent($idempotencyKey, $payloadHash);

            if ($existing !== null) {
                return $existing;
            }

            $lockedProduct = Product::query()->whereKey($product->getKey())->lockForUpdate()->firstOrFail();

            if ($lockedProduct->trashed()) {
                throw ValidationException::withMessages([
                    'product_id' => 'O produto selecionado está excluído.',
                ]);
            }

            $offer = StockOffer::query()
                ->where('product_id', $lockedProduct->getKey())
                ->where('type', $type->value)
                ->where(function (Builder $query) use ($notes): void {
                    if ($notes === null) {
                        $query->whereNull('notes');
                    } else {
                        $query->where('notes', $notes);
                    }
                })
                ->latest('id')
                ->lockForUpdate()
                ->first();

            if ($offer === null) {
                $offer = $lockedProduct->offers()->create([
                    'type' => $type,
                    'notes' => $notes,
                ]);
            }

            $nextSortOrder = ((int) $offer->stockVolumes()->max('sort_order')) + 1;
            $createdVolumes = collect();

            foreach ($volumes as $offset => $rawVolume) {
                $items = $this->normalizeItems($rawVolume['items'] ?? []);
                $this->ensureValidItems($items, $offset);
                $totalQuantity = $this->totalQuantity($rawVolume, $items);

                if ($totalQuantity <= 0) {
                    throw ValidationException::withMessages([
                        "stock_volumes.{$offset}.total_quantity" => 'Cada saco precisa ter pelo menos uma peça.',
                    ]);
                }

                $volume = $offer->stockVolumes()->create([
                    'sort_order' => $nextSortOrder + $offset,
                    'total_quantity' => $totalQuantity,
                ]);

                $this->recorder->ensureVolumeCode($volume);
                $this->createItems($volume, $items);
                $volume->load(['items', 'offer.product.category']);
                $createdVolumes->push($volume);
            }

            $resultingStates = $createdVolumes->mapWithKeys(fn (StockOfferVolume $volume): array => [
                $volume->getKey() => $this->recorder->snapshot($volume),
            ])->all();

            return $this->recorder->handle(
                StockMovementType::In,
                StockMovementSource::Manual,
                $createdVolumes,
                $actor,
                null,
                $reason,
                $notes,
                $idempotencyKey,
                $payloadHash,
                [],
                $resultingStates,
            );
        });
    }

    private function movementType(mixed $value): StockOfferType
    {
        $type = $value instanceof StockOfferType ? $value : StockOfferType::tryFrom((string) $value);

        if ($type === null) {
            throw ValidationException::withMessages([
                'stock_offer_type' => 'Selecione um tipo de estoque válido.',
            ]);
        }

        return $type;
    }

    /** @return Collection<int, array<string, mixed>> */
    private function normalizeVolumes(mixed $volumes): Collection
    {
        if (! is_array($volumes) || $volumes === []) {
            throw ValidationException::withMessages([
                'stock_volumes' => 'Adicione pelo menos um saco à entrada.',
            ]);
        }

        $normalized = [];

        foreach ($volumes as $volume) {
            if (is_array($volume)) {
                $normalized[] = $this->normalizeAssociativeArray($volume);
            }
        }

        return collect($normalized);
    }

    /** @return Collection<int, array<string, mixed>> */
    private function normalizeItems(mixed $items): Collection
    {
        if (! is_array($items)) {
            return collect();
        }

        $normalized = [];

        foreach ($items as $item) {
            if (is_array($item)) {
                $normalized[] = $this->normalizeAssociativeArray($item);
            }
        }

        return collect($normalized);
    }

    /** @param Collection<int, array<string, mixed>> $items */
    private function ensureValidItems(Collection $items, int $volumeIndex): void
    {
        $seenSizes = [];

        foreach ($items as $itemIndex => $item) {
            $size = Str::lower(Str::squish((string) ($item['size'] ?? '')));

            if ($size === '') {
                throw ValidationException::withMessages([
                    "stock_volumes.{$volumeIndex}.items.{$itemIndex}.size" => 'Informe o tamanho do saco.',
                ]);
            }

            if (isset($seenSizes[$size])) {
                throw ValidationException::withMessages([
                    "stock_volumes.{$volumeIndex}.items.{$itemIndex}.size" => 'Os tamanhos precisam ser diferentes dentro do saco.',
                ]);
            }

            $seenSizes[$size] = true;
        }
    }

    /**
     * @param  array<string, mixed>  $volume
     * @param  Collection<int, array<string, mixed>>  $items
     */
    private function totalQuantity(array $volume, Collection $items): int
    {
        $knownQuantities = $items->filter(fn (array $item): bool => filter_var($item['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN)
            && is_numeric($item['quantity'] ?? null));

        if ($knownQuantities->isNotEmpty()) {
            return (int) $knownQuantities->sum(fn (array $item): int => max(0, (int) $item['quantity']));
        }

        return max(0, (int) ($volume['total_quantity'] ?? 0));
    }

    /** @param Collection<int, array<string, mixed>> $items */
    private function createItems(StockOfferVolume $volume, Collection $items): void
    {
        foreach ($items as $sortOrder => $item) {
            $isActive = filter_var($item['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN);
            $volume->items()->create([
                'size' => Str::squish((string) ($item['size'] ?? '')),
                'sort_order' => $sortOrder,
                'is_active' => $isActive,
                'quantity' => $isActive && is_numeric($item['quantity'] ?? null)
                    ? max(0, (int) $item['quantity'])
                    : null,
            ]);
        }
    }

    private function normalizeText(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = Str::squish($value);

        return $value === '' ? null : $value;
    }

    /** @param Collection<int, array<string, mixed>> $volumes */
    private function payloadHash(Product $product, StockOfferType $type, Collection $volumes, ?string $notes, ?string $reason): string
    {
        return hash('sha256', json_encode([
            'product_id' => $product->getKey(),
            'stock_offer_type' => $type->value,
            'notes' => $notes,
            'reason' => $reason,
            'stock_volumes' => $volumes->all(),
        ], JSON_THROW_ON_ERROR));
    }

    /**
     * @param  array<mixed, mixed>  $value
     * @return array<string, mixed>
     */
    private function normalizeAssociativeArray(array $value): array
    {
        $normalized = [];

        foreach ($value as $key => $item) {
            $normalized[(string) $key] = $item;
        }

        return $normalized;
    }
}
