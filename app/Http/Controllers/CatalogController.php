<?php

namespace App\Http\Controllers;

use App\Models\CatalogSetting;
use App\Models\Product;
use App\Models\StockOfferVolume;
use App\Models\StockOfferVolumeItem;
use Illuminate\Database\Eloquent\Relations\Relation;
use Inertia\Inertia;
use Inertia\Response;
use LogicException;

class CatalogController extends Controller
{
    /**
     * Display products currently available to retailers.
     */
    public function __invoke(): Response
    {
        $products = Product::query()
            ->whereHas('latestAvailableOffer')
            ->with([
                'category:id,name',
                'media',
                'latestAvailableOffer.stockVolumes' => function (Relation $query): void {
                    $query->where('total_quantity', '>', 0)
                        ->whereNull('current_order_id')
                        ->whereNull('consumed_at');
                },
                'latestAvailableOffer.stockVolumes.items' => function (Relation $query): void {
                    $query->where('is_active', true);
                },
            ])
            ->orderBy('name')
            ->get()
            ->map(function (Product $product): array {
                $offer = $product->latestAvailableOffer;
                if ($offer === null) {
                    throw new LogicException('Catalog product loaded without an available offer.');
                }
                $cover = $product->getFirstMedia(Product::MEDIA_COLLECTION);
                $imageConversion = $cover?->hasGeneratedConversion('thumb') === true
                    ? 'thumb'
                    : null;

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'code' => $product->code,
                    'model' => $product->model,
                    'image' => $cover === null
                        ? null
                        : ($imageConversion === null ? $cover->getUrl() : $cover->getUrl($imageConversion)),
                    'category' => $product->category_id === null
                        ? 'Sem categoria'
                        : $product->category->name,
                    'line' => $product->line?->label() ?? 'Não informada',
                    'type' => $offer->type->label(),
                    'volumes' => $offer->stockVolumes->map(fn (StockOfferVolume $volume): array => [
                        'id' => $volume->id,
                        'name' => 'Saco '.str_pad((string) ($volume->sort_order + 1), 2, '0', STR_PAD_LEFT),
                        'pieces' => $volume->total_quantity,
                        'sizes' => $volume->items->map(fn (StockOfferVolumeItem $item): array => [
                            'size' => $item->size,
                            'quantity' => $item->quantity,
                        ])->values()->all(),
                    ])->values()->all(),
                ];
            });

        return Inertia::render('catalog', [
            'products' => $products,
            'canPlaceOrder' => CatalogSetting::query()->exists(),
        ]);
    }
}
