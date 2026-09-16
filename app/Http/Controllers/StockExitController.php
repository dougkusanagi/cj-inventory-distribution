<?php

namespace App\Http\Controllers;

use App\Actions\Stock\CreateManualStockOut;
use App\Http\Requests\Stock\StoreStockExitRequest;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\StockOfferVolume;
use App\Models\StockOfferVolumeItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class StockExitController extends Controller
{
    public function create(Request $request): Response
    {
        Gate::authorize('create', StockMovement::class);

        $selectedProductId = $request->integer('product');
        $selectedProductId = Product::query()->whereKey($selectedProductId)->exists()
            ? $selectedProductId
            : null;

        return Inertia::render('stock-movements/exit', [
            'volumes' => StockOfferVolume::query()
                ->whereNull('current_order_id')
                ->whereNull('consumed_at')
                ->where('total_quantity', '>', 0)
                ->when($selectedProductId !== null, fn ($query) => $query->whereHas('offer', fn ($offerQuery) => $offerQuery->where('product_id', $selectedProductId)))
                ->with(['items', 'offer.product'])
                ->orderBy('id')
                ->get()
                ->map(fn (StockOfferVolume $volume): array => [
                    'id' => $volume->id,
                    'code' => $volume->code ?? 'SC-'.str_pad((string) $volume->id, 6, '0', STR_PAD_LEFT),
                    'total_quantity' => $volume->total_quantity,
                    'product' => [
                        'code' => $volume->offer->product->code,
                        'name' => $volume->offer->product->name,
                        'model' => $volume->offer->product->model,
                    ],
                    'sizes' => $volume->items->where('is_active', true)->map(fn (StockOfferVolumeItem $item): array => [
                        'size' => $item->size,
                        'quantity' => $item->quantity,
                    ])->values()->all(),
                ])->values()->all(),
            'selectedProductId' => $selectedProductId,
        ]);
    }

    public function store(StoreStockExitRequest $request, CreateManualStockOut $createManualStockOut): RedirectResponse
    {
        Gate::authorize('create', StockMovement::class);
        $movement = $createManualStockOut->handle($request->validated(), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Saída de estoque registrada.']);

        return to_route('stock-movements.show', $movement);
    }
}
