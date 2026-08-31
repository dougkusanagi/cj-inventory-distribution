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
        $hasStockOffer = filter_var(
            $data['has_stock_offer'] ?? true,
            FILTER_VALIDATE_BOOLEAN,
        );

        if (! $hasStockOffer) {
            return $this->deactivateLatestOffer($product);
        }

        $type = StockOfferType::tryFrom(
            (string) ($data['stock_offer_type'] ?? StockOfferType::NewGrade->value),
        ) ?? StockOfferType::NewGrade;
        $rawVariants = collect($this->normalizeVariants($data['variants'] ?? []));
        $totalQuantityInput = $data['total_quantity'] ?? null;
        $activeVariants = $rawVariants->filter(
            fn (array $variant): bool => $this->isVariantActive($variant),
        );
        $hasVariantQuantities = $activeVariants->contains(
            fn (array $variant): bool => is_numeric($variant['quantity'] ?? null),
        );

        if (
            ($totalQuantityInput === null || (int) $totalQuantityInput === 0)
            && $activeVariants->isEmpty()
            && ! $hasVariantQuantities
        ) {
            return $this->deactivateLatestOffer($product);
        }

        $sumOfVariants = $activeVariants->sum(fn (array $variant): int => (int) ($variant['quantity'] ?? 0));
        $totalQuantity = $totalQuantityInput !== null ? (int) $totalQuantityInput : $sumOfVariants;
        $volumesInput = $data['volumes'] ?? null;
        $volumes = $type->requiresVolumes() && $volumesInput !== null
            ? max(0, (int) $volumesInput)
            : null;

        /** @var StockOffer $offer */
        $offer = $product->latestOffer ?? $product->offers()->create([
            'type' => $type,
            'total_quantity' => max(0, $totalQuantity),
            'volumes' => $volumes,
            'is_active' => true,
        ]);

        $offer->update([
            'type' => $type,
            'total_quantity' => max(0, $totalQuantity),
            'volumes' => $volumes,
            'is_active' => true,
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
     * Mark an existing offer unavailable when no stock information remains.
     */
    private function deactivateLatestOffer(Product $product): ?StockOffer
    {
        $offer = $product->latestOffer;

        if ($offer === null) {
            return null;
        }

        $offer->update([
            'total_quantity' => 0,
            'volumes' => $offer->type?->requiresVolumes() === true ? 0 : null,
            'is_active' => false,
        ]);
        $offer->items()->delete();

        return $offer;
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
