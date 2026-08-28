<?php

namespace App\Http\Resources;

use App\Models\Product;
use App\Models\ProductVariant;
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

        return [
            'id' => $this->id,
            'code' => $this->code,
            'model' => $this->model,
            'name' => $this->name,
            'images' => $this->whenLoaded('media', fn () => $this->media
                ->where('collection_name', Product::MEDIA_COLLECTION)
                ->map(function (Media $media): array {
                    return [
                        'id' => $media->id,
                        'url' => $media->getUrl(),
                        'thumb_url' => $media->hasGeneratedConversion('thumb')
                            ? $media->getUrl('thumb')
                            : null,
                        'name' => $media->name,
                    ];
                })
                ->values()
                ->all()),
            'notes' => $this->notes,
            'total_quantity' => $offer?->total_quantity,
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
}
