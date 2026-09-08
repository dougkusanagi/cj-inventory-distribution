<?php

namespace App\Actions\Products;

use App\Enums\StockOfferType;
use App\Models\Product;
use App\Models\StockOffer;
use App\Models\StockOfferVolume;
use App\Models\StockOfferVolumeItem;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class SyncProductStockOffer
{
    /**
     * Synchronize the product's stock offer and its physical sacks atomically.
     *
     * @param  array<string, mixed>  $data
     */
    public function handle(Product $product, array $data): ?StockOffer
    {
        return DB::transaction(function () use ($product, $data): ?StockOffer {
            $isVisibleInCatalog = filter_var(
                $data['has_stock_offer'] ?? true,
                FILTER_VALIDATE_BOOLEAN,
            );
            $offer = $product->offers()->latest('id')->lockForUpdate()->first();
            $typeInput = $data['stock_offer_type']
                ?? $offer?->type->value
                ?? StockOfferType::NewGrade->value;
            $type = StockOfferType::tryFrom((string) $typeInput)
                ?? StockOfferType::NewGrade;
            $rawVolumes = $this->normalizeVolumes($data['stock_volumes'] ?? []);

            if ($offer === null && (! $isVisibleInCatalog || $rawVolumes->isEmpty())) {
                return null;
            }

            if ($offer !== null && $rawVolumes->isEmpty()) {
                $offer->update(['is_active' => false]);

                return $offer->fresh(['stockVolumes.items']);
            }

            if ($offer === null) {
                $offer = $product->offers()->create([
                    'type' => $type,
                    'is_active' => $isVisibleInCatalog,
                ]);
            } else {
                $offer->update([
                    'type' => $type,
                    'is_active' => $isVisibleInCatalog,
                ]);
            }

            $existingVolumes = $offer->stockVolumes()->get()->keyBy('id');
            $usedVolumeIds = [];

            foreach ($rawVolumes as $index => $rawVolume) {
                $items = $this->normalizeVolumeItems($rawVolume['items'] ?? []);
                $volumeTotal = $this->calculateVolumeTotal($rawVolume, $items);
                $volume = $this->findVolume($existingVolumes, $rawVolume);

                if ($volume === null) {
                    $volume = $offer->stockVolumes()->create([
                        'sort_order' => $index,
                        'total_quantity' => $volumeTotal,
                    ]);
                } else {
                    $volume->update([
                        'sort_order' => $index,
                        'total_quantity' => $volumeTotal,
                    ]);
                }

                $usedVolumeIds[] = $volume->getKey();
                $this->syncVolumeItems($volume, $items);
            }

            if ($usedVolumeIds === []) {
                throw new InvalidArgumentException('An offer must contain at least one stock volume.');
            }

            $offer->stockVolumes()->whereNotIn('id', $usedVolumeIds)->delete();

            return $offer->fresh(['stockVolumes.items']);
        });
    }

    /**
     * Calculate a sack total from active known quantities or its manual value.
     *
     * @param  array<string, mixed>  $volume
     * @param  Collection<int, mixed[]>  $items
     */
    private function calculateVolumeTotal(array $volume, Collection $items): int
    {
        $activeItems = $items->filter(
            fn (array $item): bool => $this->isActive($item),
        );
        $hasKnownQuantity = $activeItems->contains(
            fn (array $item): bool => is_numeric($item['quantity'] ?? null),
        );

        if ($hasKnownQuantity) {
            return (int) $activeItems->sum(
                fn (array $item): int => max(0, (int) ($item['quantity'] ?? 0)),
            );
        }

        return max(0, (int) ($volume['total_quantity'] ?? 0));
    }

    /**
     * Normalize the submitted sack payload.
     *
     * @return Collection<int, mixed[]>
     */
    private function normalizeVolumes(mixed $volumes): Collection
    {
        if (! is_array($volumes)) {
            return collect();
        }

        return collect($volumes)
            ->filter(fn (mixed $volume): bool => is_array($volume))
            ->values();
    }

    /**
     * Normalize the submitted size payload inside one sack.
     *
     * @return Collection<int, mixed[]>
     */
    private function normalizeVolumeItems(mixed $items): Collection
    {
        if (! is_array($items)) {
            return collect();
        }

        return collect($items)
            ->filter(fn (mixed $item): bool => is_array($item))
            ->values();
    }

    /**
     * Locate a submitted sack among the current offer's sacks.
     *
     * @param  Collection<int, StockOfferVolume>  $existingVolumes
     * @param  array<string, mixed>  $rawVolume
     */
    private function findVolume(Collection $existingVolumes, array $rawVolume): ?StockOfferVolume
    {
        $submittedId = $rawVolume['id'] ?? null;

        if (is_numeric($submittedId) && $existingVolumes->has((int) $submittedId)) {
            return $existingVolumes->get((int) $submittedId);
        }

        return null;
    }

    /**
     * Synchronize the sizes in a sack while retaining existing IDs.
     *
     * @param  Collection<int, mixed[]>  $items
     */
    private function syncVolumeItems(StockOfferVolume $volume, Collection $items): void
    {
        $existingItems = $volume->items()->get()->keyBy('id');
        $usedItemIds = [];

        foreach ($items as $index => $rawItem) {
            $isActive = $this->isActive($rawItem);
            $size = trim((string) ($rawItem['size'] ?? ''));
            $item = null;
            $submittedId = $rawItem['id'] ?? null;

            if (is_numeric($submittedId) && $existingItems->has((int) $submittedId)) {
                $item = $existingItems->get((int) $submittedId);
            } elseif ($size !== '') {
                $item = $existingItems->first(
                    fn (StockOfferVolumeItem $candidate): bool => $candidate->size === $size
                        && ! in_array($candidate->getKey(), $usedItemIds, true),
                );
            }

            $attributes = [
                'size' => $size,
                'sort_order' => $index,
                'is_active' => $isActive,
                'quantity' => $isActive && is_numeric($rawItem['quantity'] ?? null)
                    ? max(0, (int) $rawItem['quantity'])
                    : null,
            ];

            if ($item === null) {
                $item = $volume->items()->create($attributes);
            } else {
                $item->update($attributes);
            }

            $usedItemIds[] = $item->getKey();
        }

        $volume->items()
            ->whereNotIn('id', $usedItemIds)
            ->delete();
    }

    /**
     * Determine whether a size is present in its sack.
     *
     * @param  array<string, mixed>  $item
     */
    private function isActive(array $item): bool
    {
        return filter_var($item['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN);
    }
}
