<?php

namespace App\Http\Resources;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

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
            'image_url' => $this->image_path !== null
                ? Storage::disk('public')->url($this->image_path)
                : null,
            'notes' => $this->notes,
            'total_quantity' => $offer?->total_quantity,
            'variants' => $this->whenLoaded('variants', fn () => $this->variants
                ->map(function (ProductVariant $variant) use ($itemsByVariant): array {
                    $stockItem = $itemsByVariant->get($variant->id);

                    return [
                        'id' => $variant->id,
                        'size' => $variant->size,
                        'sort_order' => $variant->sort_order,
                        'is_active' => $stockItem?->is_active ?? false,
                        'quantity' => $stockItem?->is_active ? $stockItem->quantity : null,
                    ];
                })
                ->values()),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
