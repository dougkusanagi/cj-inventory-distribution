<?php

namespace App\Http\Controllers;

use App\Actions\Products\UpdateProduct;
use App\Http\Requests\Products\UpdateProductPhotosRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Support\NormalizedSearch;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Inertia\Inertia;
use Inertia\Response;

class ProductPhotoController extends Controller
{
    public function __construct(private readonly UpdateProduct $updateProduct) {}

    /**
     * List products so marketing can find and manage their photos.
     */
    public function index(Request $request): Response
    {
        $search = trim($request->string('search')->toString());
        $image = $request->string('image', 'all')->toString();

        if (! in_array($image, ['all', 'with', 'without'], true)) {
            $image = 'all';
        }

        $hasImages = fn (Builder $query) => $query->where('collection_name', Product::MEDIA_COLLECTION);
        $products = Product::query()
            ->select(['id', 'code', 'model', 'name', 'category_id', 'stock_offer_type', 'is_active', 'created_at'])
            ->with(['category:id,name,is_active', 'media'])
            ->when($search !== '', fn (Builder $query) => NormalizedSearch::apply($query, $search, ['name', 'model', 'code']))
            ->when($image === 'with', fn (Builder $query) => $query->whereHas('media', $hasImages))
            ->when($image === 'without', fn (Builder $query) => $query->whereDoesntHave('media', $hasImages))
            ->latest()
            ->orderBy('id')
            ->paginate(24)
            ->withQueryString()
            ->through(fn (Product $product): array => Arr::only(
                ProductResource::make($product)->resolve(),
                ['id', 'code', 'name', 'model', 'category', 'is_active', 'images'],
            ));

        return Inertia::render('product-photos/index', [
            'products' => [
                'data' => $products->items(),
                'links' => $products->linkCollection()->toArray(),
                'meta' => [
                    'current_page' => $products->currentPage(),
                    'last_page' => $products->lastPage(),
                    'total' => $products->total(),
                ],
            ],
            'filters' => [
                'search' => $search,
                'image' => $image,
            ],
            'withoutPhotosCount' => Product::query()->whereDoesntHave('media', $hasImages)->count(),
        ]);
    }

    /**
     * Add, remove, edit and reorder the photos of a product.
     */
    public function update(UpdateProductPhotosRequest $request, Product $product): RedirectResponse
    {
        $this->updateProduct->updateImages($product, $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Fotos de '.$product->name.' salvas.']);

        return back();
    }
}
