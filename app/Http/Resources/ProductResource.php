<?php

namespace App\Http\Resources;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockOffer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * @mixin Product
 */
class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $offer = $this->relationLoaded('latestOffer') ? $this->latestOffer : null;
        $itemsByVariant = $offer && $offer->relationLoaded('items')
            ? $offer->items->keyBy('product_variant_id')
            : collect();
        $hasPositiveStock = ($offer?->total_quantity ?? 0) > 0;
        $requiresVolumes = $offer?->type?->requiresVolumes() === true;
        $hasAvailableVolumes = ! $requiresVolumes || ($offer?->volumes ?? 0) > 0;
        $availableForDistribution = $this->is_active
            && $offer?->is_active === true
            && $hasPositiveStock
            && $hasAvailableVolumes;

        return [
            'id' => $this->id,
            'code' => $this->code,
            'model' => $this->model,
            'name' => $this->name,
            'is_active' => $this->is_active,
            'images' => $this->whenLoaded('media', fn () => $this->media
                ->where('collection_name', Product::MEDIA_COLLECTION)
                ->sortBy('order_column')
                ->map(function (Media $media): array {
                    return [
                        'id' => $media->id,
                        'url' => $this->mediaUrl($media),
                        'thumb_url' => $media->hasGeneratedConversion('thumb')
                            ? $this->mediaUrl($media, 'thumb')
                            : null,
                        'name' => $media->name,
                    ];
                })
                ->values()
                ->all()),
            'notes' => $this->notes,
            'has_stock_offer' => $offer?->is_active === true,
            'available_for_distribution' => $availableForDistribution,
            'distribution_status' => $this->distributionStatus($offer, $hasPositiveStock, $hasAvailableVolumes),
            'stock_offer_type' => $offer?->type?->value,
            'total_quantity' => $offer?->total_quantity,
            'volumes' => $offer?->volumes,
            'variants' => $this->whenLoaded('variants', fn () => $this->variants
                ->map(function (ProductVariant $variant) use ($itemsByVariant): array {
                    $stockItem = $itemsByVariant->get($variant->id);

                    return [
                        'id' => $variant->id,
                        'size' => $variant->size,
                        'sort_order' => $variant->sort_order,
                        'is_active' => $stockItem?->is_active === true,
                        'quantity' => $stockItem?->is_active ? $stockItem->quantity : null,
                    ];
                })
                ->values()),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    private function distributionStatus(?StockOffer $offer, bool $hasPositiveStock, bool $hasAvailableVolumes): string
    {
        if (! $this->is_active) {
            return 'Produto oculto';
        }

        if ($offer?->is_active !== true) {
            return 'Sem estoque disponível';
        }

        if (! $hasPositiveStock) {
            return 'Estoque zerado';
        }

        if (! $hasAvailableVolumes) {
            return 'Sem sacos disponíveis';
        }

        return 'Disponível para distribuição';
    }

    /**
     * Return a media URL relative to the current application origin.
     *
     * The public disk may be configured with a development host that differs
     * from the host used to open the application (for example, a LAN IP and
     * localhost). A relative URL keeps the browser on the same origin.
     */
    private function mediaUrl(Media $media, ?string $conversion = null): string
    {
        $url = $conversion === null
            ? $media->getUrl()
            : $media->getUrl($conversion);
        $parts = parse_url($url);

        if ($parts === false || ! isset($parts['path'])) {
            return $url;
        }

        return $parts['path'].(isset($parts['query']) ? '?'.$parts['query'] : '');
    }
}
