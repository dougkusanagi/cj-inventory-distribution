<?php

namespace App\Http\Controllers;

use App\Enums\ProductLine;
use App\Models\CatalogSetting;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockOffer;
use App\Models\StockOfferVolume;
use App\Models\StockOfferVolumeItem;
use App\Support\NormalizedSearch;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use LogicException;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class CatalogController extends Controller
{
    /**
     * Display products currently available to retailers.
     */
    public function __invoke(Request $request): Response
    {
        $search = trim($request->string('search')->toString());
        $categoryId = $request->integer('category');
        $line = $request->string('line')->toString();
        $bagVolumeIds = collect($this->normalizeBagVolumeIds($request->input('bag', [])));

        $products = Product::query()
            ->whereHas('latestAvailableOffer')
            ->when($search !== '', function (Builder $query) use ($search): void {
                NormalizedSearch::apply($query, $search, ['name', 'model', 'code']);
            })
            ->when($categoryId > 0, fn (Builder $query) => $query->where('category_id', $categoryId))
            ->when(in_array($line, array_column(ProductLine::cases(), 'value'), true), fn (Builder $query) => $query->where('line', $line))
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
            ->orderBy('id')
            ->paginate(12)
            ->withQueryString()
            ->through(function (Product $product): array {
                $offer = $product->latestAvailableOffer;
                if ($offer === null) {
                    throw new LogicException('Catalog product loaded without an available offer.');
                }

                return $this->catalogProductData($product, $offer, $offer->stockVolumes);
            });

        $availableBagVolumeIds = $bagVolumeIds->isEmpty()
            ? collect()
            : StockOfferVolume::query()
                ->whereIn('id', $bagVolumeIds)
                ->where('total_quantity', '>', 0)
                ->whereNull('current_order_id')
                ->whereNull('consumed_at')
                ->whereIn('stock_offer_id', StockOffer::query()
                    ->availableForCatalog()
                    ->select('id'))
                ->pluck('id');

        $bagProducts = $bagVolumeIds->isEmpty() || $availableBagVolumeIds->isEmpty()
            ? collect()
            : StockOfferVolume::query()
                ->whereIn('id', $availableBagVolumeIds)
                ->with([
                    'offer.product.category',
                    'offer.product.media',
                    'items' => function (Relation $query): void {
                        $query->where('is_active', true);
                    },
                ])
                ->get()
                ->groupBy(fn (StockOfferVolume $volume): int => $volume->offer->product->id)
                ->map(function (Collection $volumes): array {
                    $volume = $volumes->first();
                    if ($volume === null) {
                        throw new LogicException('Catalog bag loaded without a stock volume.');
                    }
                    $product = $volume->offer->product;

                    return $this->catalogProductData($product, $volume->offer, $volumes);
                })
                ->values();

        return Inertia::render('catalog', [
            'products' => [
                'data' => $products->items(),
                'links' => $products->linkCollection()->toArray(),
                'meta' => [
                    'current_page' => $products->currentPage(),
                    'last_page' => $products->lastPage(),
                    'next_page_url' => $products->nextPageUrl(),
                    'total' => $products->total(),
                ],
            ],
            'filters' => [
                'search' => $search,
                'category' => $categoryId > 0 ? $categoryId : null,
                'line' => $line,
            ],
            'categories' => Category::query()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->toArray(),
            'lines' => array_map(fn (ProductLine $line): array => [
                'value' => $line->value,
                'label' => $line->label(),
            ], ProductLine::cases()),
            'bag' => [
                'unavailable_volume_ids' => $bagVolumeIds
                    ->diff($availableBagVolumeIds)
                    ->values()
                    ->all(),
                'products' => $bagProducts->all(),
            ],
            'canPlaceOrder' => CatalogSetting::query()->exists(),
        ]);
    }

    /**
     * @param  Collection<int, StockOfferVolume>  $stockVolumes
     * @return array<string, mixed>
     */
    private function catalogProductData(Product $product, StockOffer $offer, Collection $stockVolumes): array
    {
        $images = $product->media
            ->where('collection_name', Product::MEDIA_COLLECTION)
            ->sortBy('order_column')
            ->map(function (Media $media): string {
                return $media->hasGeneratedConversion('thumb')
                    ? $media->getUrl('thumb')
                    : $media->getUrl();
            })
            ->values()
            ->all();
        $category = $product->category;

        return [
            'id' => $product->id,
            'name' => $product->name,
            'code' => $product->code,
            'model' => $product->model,
            'image' => $images[0] ?? null,
            'images' => $images,
            'category' => $product->category_id === null
                ? 'Sem categoria'
                : ($category === null ? 'Sem categoria' : $category->name),
            'category_id' => $product->category_id,
            'line' => $product->line?->label(),
            'type' => $offer->type->label(),
            'volumes' => $stockVolumes->map(fn (StockOfferVolume $volume): array => [
                'id' => $volume->id,
                'name' => 'Saco '.str_pad((string) ($volume->sort_order + 1), 2, '0', STR_PAD_LEFT),
                'pieces' => $volume->total_quantity,
                'sizes' => $volume->items->map(fn (StockOfferVolumeItem $item): array => [
                    'size' => $item->size,
                    'quantity' => $item->quantity,
                ])->values()->all(),
            ])->values()->all(),
        ];
    }

    /**
     * @return list<int>
     */
    private function normalizeBagVolumeIds(mixed $value): array
    {
        $values = is_array($value) ? $value : [$value];

        return array_values(array_unique(array_filter(
            array_map(static fn (mixed $id): int => (int) $id, $values),
            static fn (int $id): bool => $id > 0,
        )));
    }
}
