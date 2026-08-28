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
        return [
            'id' => $this->id,
            'code' => $this->code,
            'model' => $this->model,
            'name' => $this->name,
            'image_url' => $this->image_path !== null
                ? Storage::disk('public')->url($this->image_path)
                : null,
            'notes' => $this->notes,
            'variants' => $this->whenLoaded('variants', fn () => $this->variants
                ->map(fn (ProductVariant $variant): array => [
                    'id' => $variant->id,
                    'size' => $variant->size,
                    'sort_order' => $variant->sort_order,
                ])
                ->values()),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
