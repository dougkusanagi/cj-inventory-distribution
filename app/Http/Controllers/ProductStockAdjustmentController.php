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
        $data = $request->validated();
        if (isset($data['volumes'])) {
            $adjustProductStock->handleMany($product, $data, $request->user());
        } else {
            $adjustProductStock->handle($product, $data, $request->user());
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Correção de estoque registrada.']);

        return to_route('products.edit', $product);
    }
}
