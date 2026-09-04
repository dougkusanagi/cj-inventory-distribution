<?php

namespace App\Http\Controllers;

use App\Actions\Products\CreateProduct;
use App\Actions\Products\DeleteProduct;
use App\Actions\Products\UpdateProduct;
use App\Http\Requests\Products\StoreProductRequest;
use App\Http\Requests\Products\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function __construct(
        private readonly CreateProduct $createProduct,
        private readonly UpdateProduct $updateProduct,
        private readonly DeleteProduct $deleteProduct,
    ) {}

    /**
     * Display the product catalog.
     */
    public function index(): Response
    {
        Gate::authorize('viewAny', Product::class);

        $products = Product::query()
            ->select(['id', 'code', 'model', 'name', 'notes', 'is_active', 'created_at', 'updated_at'])
            ->with(['variants:id,product_id,size,sort_order', 'latestOffer.items', 'media'])
            ->latest()
            ->paginate(12);

        return Inertia::render('products/index', [
            'products' => ProductResource::collection($products),
        ]);
    }

    /**
     * Display the product creation form.
     */
    public function create(): Response
    {
        Gate::authorize('create', Product::class);

        return Inertia::render('products/create');
    }

    /**
     * Store a newly created product.
     */
    public function store(StoreProductRequest $request): RedirectResponse
    {
        Gate::authorize('create', Product::class);
        $this->createProduct->handle($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Produto cadastrado.']);

        return to_route('products.index');
    }

    /**
     * Display the product editing form.
     */
    public function edit(Product $product): Response
    {
        Gate::authorize('update', $product);

        return Inertia::render('products/edit', [
            'product' => ProductResource::make($product->load(['variants', 'latestOffer.items', 'media']))->resolve(),
        ]);
    }

    /**
     * Update the specified product.
     */
    public function update(UpdateProductRequest $request, Product $product): RedirectResponse
    {
        Gate::authorize('update', $product);
        $this->updateProduct->handle($product, $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Produto atualizado.']);

        return to_route('products.index');
    }

    /**
     * Remove the specified product.
     */
    public function destroy(Product $product): RedirectResponse
    {
        Gate::authorize('delete', $product);
        $this->deleteProduct->handle($product);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Produto excluído.']);

        return to_route('products.index');
    }
}
