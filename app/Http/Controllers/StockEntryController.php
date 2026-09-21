<?php

namespace App\Http\Controllers;

use App\Actions\Stock\CreateStockEntry;
use App\Http\Requests\Stock\StoreStockEntryRequest;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class StockEntryController extends Controller
{
    public function create(Request $request): Response
    {
        Gate::authorize('create', StockMovement::class);

        $selectedProductId = $request->integer('product');
        $selectedProductId = Product::query()->whereKey($selectedProductId)->exists()
            ? $selectedProductId
            : null;

        return Inertia::render('stock-movements/entry', [
            'products' => Product::query()
                ->with('category:id,name')
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'model', 'category_id'])
                ->map(fn (Product $product): array => [
                    'id' => $product->id,
                    'code' => $product->code,
                    'name' => $product->name,
                    'model' => $product->model,
                    'category' => $product->category?->name,
                ])->values()->all(),
            'categories' => Category::query()->orderBy('name')->get(['id', 'name'])->toArray(),
            'selectedProductId' => $selectedProductId,
        ]);
    }

    public function store(StoreStockEntryRequest $request, CreateStockEntry $createStockEntry): RedirectResponse
    {
        Gate::authorize('create', StockMovement::class);
        $product = Product::query()->findOrFail($request->integer('product_id'));
        $movement = $createStockEntry->handle($product, $request->validated(), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Entrada de estoque registrada.']);

        return $request->string('return_to')->toString() === 'product'
            ? to_route('products.edit', $product)
            : to_route('stock-movements.show', $movement);
    }
}
