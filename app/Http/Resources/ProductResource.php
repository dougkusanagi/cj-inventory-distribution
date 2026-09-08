<?php

namespace App\Http\Resources;

use App\Models\Product;
use App\Models\StockOffer;
use App\Models\StockOfferVolume;
use App\Models\StockOfferVolumeItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;
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
        $stockVolumes = $offer && $offer->relationLoaded('stockVolumes')
            ? $offer->stockVolumes
            : collect();
        $totalQuantity = $offer === null
            ? null
            : (int) $stockVolumes->sum('total_quantity');
        $hasPositiveStock = ($totalQuantity ?? 0) > 0;
        $hasAvailableVolumes = $this->hasAvailablePhysicalVolume($stockVolumes);

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
            'total_quantity' => $totalQuantity,
            'stock_volume_count' => $stockVolumes->count(),
            'stock_volumes' => $stockVolumes
                ->map(fn (StockOfferVolume $volume): array => $this->stockVolumeData($volume))
                ->values()
                ->all(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    /**
     * Serialize one physical sack and its sizes for the product form.
     *
     * @return array<string, mixed>
     */
    private function stockVolumeData(StockOfferVolume $volume): array
    {
        return [
            'id' => $volume->id,
            'sort_order' => $volume->sort_order,
            'total_quantity' => $volume->total_quantity,
            'items' => $volume->relationLoaded('items')
                ? $volume->items->map(fn (StockOfferVolumeItem $item): array => [
                    'id' => $item->id,
                    'size' => $item->size,
                    'sort_order' => $item->sort_order,
                    'is_active' => $item->is_active,
                    'quantity' => $item->is_active ? $item->quantity : null,
                ])->values()->all()
                : [],
        ];
    }

    /**
     * Determine availability when the offer has physical sacks.
     *
     * @param  Collection<int, StockOfferVolume>  $stockVolumes
     */
    private function hasAvailablePhysicalVolume(Collection $stockVolumes): bool
    {
        return $stockVolumes->contains(
            fn (StockOfferVolume $volume): bool => $volume->total_quantity > 0,
        );
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
