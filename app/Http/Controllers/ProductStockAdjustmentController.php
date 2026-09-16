<?php

namespace App\Http\Controllers;

use App\Actions\Stock\AdjustProductStock;
use App\Http\Requests\Stock\StoreProductStockAdjustmentRequest;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class ProductStockAdjustmentController extends Controller
{
    public function __invoke(StoreProductStockAdjustmentRequest $request, Product $product, AdjustProductStock $adjustProductStock): RedirectResponse
    {
        Gate::authorize('update', $product);
        $movement = $adjustProductStock->handle($product, $request->validated(), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Contagem do saco atualizada.']);

        return to_route('products.edit', $product);
    }
}
