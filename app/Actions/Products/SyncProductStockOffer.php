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
        $rawVariants = collect($data['variants'] ?? [])->values();
        $totalQuantityInput = $data['total_quantity'] ?? null;
        $activeVariants = $rawVariants->filter(
            fn ($variant): bool => is_array($variant) && $this->isVariantActive($variant),
        );
        $hasVariantQuantities = $activeVariants->contains(
            fn (array $variant): bool => is_numeric($variant['quantity'] ?? null),
        );

        if ($totalQuantityInput === null && $activeVariants->isEmpty() && ! $hasVariantQuantities) {
            return $this->deactivateLatestOffer($product);
        }

        $sumOfVariants = $activeVariants->sum(fn (array $variant): int => (int) ($variant['quantity'] ?? 0));
        $totalQuantity = $totalQuantityInput !== null ? (int) $totalQuantityInput : $sumOfVariants;

        $type = StockOfferType::NewGrade;
        if ($activeVariants->isNotEmpty() && $hasVariantQuantities) {
            $allFilled = $activeVariants->every(
                fn (array $variant): bool => is_numeric($variant['quantity'] ?? null),
            );
            $type = $allFilled ? StockOfferType::NewGrade : StockOfferType::BrokenGrade;
        }

        /** @var StockOffer $offer */
        $offer = $product->latestOffer ?? $product->offers()->create([
            'type' => $type,
            'total_quantity' => max(0, $totalQuantity),
            'is_active' => true,
        ]);

        $offer->update([
            'type' => $type,
            'total_quantity' => max(0, $totalQuantity),
            'is_active' => true,
        ]);

        $offer->items()->delete();

        foreach ($variants as $index => $variantModel) {
            $rawVariant = $rawVariants->get($index, []);
            $isActive = is_array($rawVariant) && $this->isVariantActive($rawVariant);
            $quantity = $isActive && is_array($rawVariant) ? $rawVariant['quantity'] ?? null : null;

            $offer->items()->create([
                'product_variant_id' => $variantModel->id,
                'quantity' => is_numeric($quantity) ? (int) $quantity : null,
                'is_active' => $isActive,
            ]);
        }

        return $offer;
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
