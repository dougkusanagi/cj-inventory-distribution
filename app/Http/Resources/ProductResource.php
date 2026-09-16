<?php

namespace App\Http\Resources;

use App\Enums\StockOfferType;
use App\Models\Product;
use App\Models\StockOffer;
use App\Models\StockOfferVolume;
use App\Models\StockOfferVolumeItem;
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
        $stockVolumes = $offer && $offer->relationLoaded('stockVolumes')
            ? $offer->stockVolumes
            : collect();
        if ($this->relationLoaded('offers')) {
            $offer = $this->offers->sortByDesc('id')->first();
            $stockVolumes = $this->offers->flatMap(fn (StockOffer $stockOffer) => $stockOffer->stockVolumes);
        }
        $totalQuantity = $offer === null
            ? null
            : (int) $stockVolumes->sum('total_quantity');
        $availableVolumes = $stockVolumes->filter(fn (StockOfferVolume $volume): bool => $volume->total_quantity > 0
            && $volume->current_order_id === null
            && $volume->consumed_at === null);
        $physicalVolumes = $stockVolumes->filter(fn (StockOfferVolume $volume): bool => $volume->total_quantity > 0
            && $volume->consumed_at === null);
        $reservedQuantity = (int) $stockVolumes
            ->filter(fn (StockOfferVolume $volume): bool => $volume->current_order_id !== null
                && $volume->consumed_at === null)
            ->sum('total_quantity');
        $consumedQuantity = (int) $stockVolumes
            ->filter(fn (StockOfferVolume $volume): bool => $volume->consumed_at !== null)
            ->sum('total_quantity');
        $availableQuantity = (int) $availableVolumes->sum('total_quantity');
        $physicalQuantity = (int) $physicalVolumes->sum('total_quantity');
        $hasPositiveStock = ($totalQuantity ?? 0) > 0;
        $hasAvailableVolumes = $availableVolumes->isNotEmpty();

        $availableForDistribution = $this->is_active && $availableVolumes->contains(
            fn (StockOfferVolume $volume): bool => $volume->offer->type !== StockOfferType::NewGrade,
        );

        return [
            'id' => $this->id,
            'code' => $this->code,
            'model' => $this->model,
            'name' => $this->name,
            'category_id' => $this->category_id,
            'category' => $this->whenLoaded('category', fn () => $this->category === null ? null : [
                'id' => $this->category->id,
                'name' => $this->category->name,
                'is_active' => $this->category->is_active,
            ]),
            'line' => $this->line?->value,
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
            'available_for_distribution' => $availableForDistribution,
            'distribution_status' => $availableForDistribution ? 'Disponível para distribuição' : $this->distributionStatus($offer, $hasPositiveStock, $hasAvailableVolumes),
            'stock_offer_type' => $offer?->type?->value,
            'total_quantity' => $totalQuantity,
            'physical_quantity' => $physicalQuantity,
            'available_quantity' => $availableQuantity,
            'reserved_quantity' => $reservedQuantity,
            'consumed_quantity' => $consumedQuantity,
            'stock_volume_count' => $stockVolumes->count(),
            'physical_stock_volume_count' => $physicalVolumes->count(),
            'available_stock_volume_count' => $availableVolumes->count(),
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
            'is_locked' => true,
            'code' => $volume->code ?? 'SC-'.str_pad((string) $volume->id, 6, '0', STR_PAD_LEFT),
            'stock_version' => $volume->stock_version,
            'can_recount' => $volume->current_order_id === null && $volume->consumed_at === null,
            'status' => $volume->consumed_at !== null ? 'Consumido' : ($volume->current_order_id !== null ? 'Reservado' : 'Disponível'),
            'offer_type' => $volume->offer->type->label(),
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

    private function distributionStatus(?StockOffer $offer, bool $hasPositiveStock, bool $hasAvailableVolumes): string
    {
        if (! $this->is_active) {
            return 'Produto oculto';
        }

        if ($offer === null) {
            return 'Sem estoque disponível';
        }

        if ($offer->type === StockOfferType::NewGrade) {
            return 'Uso interno (Grade Nova)';
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
