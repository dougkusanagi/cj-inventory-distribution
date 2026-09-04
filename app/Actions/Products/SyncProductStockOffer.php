<?php

namespace App\Actions\Products;

use App\Enums\StockOfferType;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockOffer;
use Illuminate\Support\Collection;

class SyncProductStockOffer
{
    /**
     * Synchronize the product's current stock offer and size availability.
     *
     * @param  Collection<int, ProductVariant>  $variants
     * @param  array<string, mixed>  $data
     */
    public function handle(Product $product, Collection $variants, array $data): ?StockOffer
    {
        $isVisibleInCatalog = filter_var(
            $data['has_stock_offer'] ?? true,
            FILTER_VALIDATE_BOOLEAN,
        );
        $offer = $product->latestOffer;
        $typeInput = $data['stock_offer_type']
            ?? $offer?->type->value
            ?? StockOfferType::NewGrade->value;
        $type = StockOfferType::tryFrom((string) $typeInput) ?? StockOfferType::NewGrade;
        $rawVariants = collect($this->normalizeVariants($data['variants'] ?? []));
        $totalQuantityInput = $data['total_quantity'] ?? null;
        $activeVariants = $rawVariants->filter(
            fn (array $variant): bool => $this->isVariantActive($variant),
        );
        $hasVariantQuantities = $activeVariants->contains(
            fn (array $variant): bool => is_numeric($variant['quantity'] ?? null),
        );
        $volumesInput = $data['volumes'] ?? null;
        $hasStockData = (int) $totalQuantityInput > 0
            || (int) $volumesInput > 0
            || $activeVariants->isNotEmpty()
            || $hasVariantQuantities;

        if ($offer === null && ! $hasStockData) {
            return null;
        }

        $sumOfVariants = $activeVariants->sum(fn (array $variant): int => (int) ($variant['quantity'] ?? 0));
        $totalQuantity = $hasVariantQuantities
            ? $sumOfVariants
            : ($totalQuantityInput !== null
                ? (int) $totalQuantityInput
                : $offer->total_quantity ?? $sumOfVariants);
        $volumes = $type->requiresVolumes()
            ? ($volumesInput !== null
                ? max(0, (int) $volumesInput)
                : $offer?->volumes)
            : null;

        if ($offer === null) {
            $offer = $product->offers()->create([
                'type' => $type,
                'total_quantity' => max(0, $totalQuantity),
                'volumes' => $volumes,
                'is_active' => $isVisibleInCatalog,
            ]);
        }

        $offer->update([
            'type' => $type,
            'total_quantity' => max(0, $totalQuantity),
            'volumes' => $volumes,
            'is_active' => $isVisibleInCatalog,
        ]);

        $offer->items()->delete();

        foreach ($variants as $index => $variantModel) {
            $rawVariant = $rawVariants->get($index, []);
            $isActive = $this->isVariantActive($rawVariant);
            $quantity = $isActive ? $rawVariant['quantity'] ?? null : null;

            $offer->items()->create([
                'product_variant_id' => $variantModel->id,
                'quantity' => is_numeric($quantity) ? (int) $quantity : null,
                'is_active' => $isActive,
            ]);
        }

        return $offer;
    }

    /**
     * Normalize the flexible request payload into variant records.
     *
     * @return array<int, array<string, mixed>>
     */
    private function normalizeVariants(mixed $variants): array
    {
        if (! is_array($variants)) {
            return [];
        }

        $normalized = [];

        foreach ($variants as $variant) {
            if (is_array($variant)) {
                $normalized[] = $variant;
            }
        }

        return $normalized;
    }

    /**
     * Determine whether a size is available in the stock offer.
     *
     * Legacy payloads without the field keep the previous behavior and remain active.
     *
     * @param  array<string, mixed>  $variant
     */
    private function isVariantActive(array $variant): bool
    {
        return filter_var($variant['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN);
    }
}
