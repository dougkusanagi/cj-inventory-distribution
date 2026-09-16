<?php

namespace App\Http\Controllers;

use App\Actions\Stock\ManageInventoryCount;
use App\Http\Requests\Stock\SaveInventoryCountItemRequest;
use App\Http\Requests\Stock\StoreInventoryCountRequest;
use App\Models\InventoryCount;
use App\Models\StockMovement;
use App\Models\StockOfferVolume;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class InventoryCountController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('create', StockMovement::class);
        $search = trim($request->string('search')->toString());
        $volumes = StockOfferVolume::query()->whereNull('current_order_id')->whereNull('consumed_at')
            ->whereHas('offer', fn ($query) => $query->whereNull('deleted_at')->whereHas('product', fn ($products) => $products->whereNull('deleted_at')))
            ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                ->where('code', 'like', '%'.$search.'%')
                ->orWhereHas('offer.product', fn ($products) => $products->where('name', 'like', '%'.$search.'%')->orWhere('code', 'like', '%'.$search.'%')->orWhere('model', 'like', '%'.$search.'%'))))
            ->with('offer.product')->orderBy('id')->paginate(30)->withQueryString()
            ->through(fn (StockOfferVolume $volume): array => [
                'id' => $volume->id, 'code' => $volume->code ?? 'SC-'.str_pad((string) $volume->id, 6, '0', STR_PAD_LEFT),
                'product' => $volume->offer->product->name, 'total_quantity' => $volume->total_quantity,
            ]);

        return Inertia::render('inventory/index', [
            'volumes' => $volumes, 'search' => $search,
            'counts' => InventoryCount::withCount('items')->latest('id')->paginate(15, ['*'], 'counts_page')->withQueryString(),
        ]);
    }

    public function store(StoreInventoryCountRequest $request, ManageInventoryCount $action): RedirectResponse
    {
        $data = $request->validated();
        $count = $action->open([
            'volume_ids' => array_map(fn (mixed $id): int => (int) $id, $data['volume_ids']),
            'reason' => (string) $data['reason'],
            'idempotency_key' => (string) $data['idempotency_key'],
        ], $request->user());

        return to_route('inventory.show', $count);
    }

    public function show(InventoryCount $inventory): Response
    {
        Gate::authorize('create', StockMovement::class);

        return Inertia::render('inventory/show', ['inventory' => $inventory->load('items')]);
    }

    public function update(SaveInventoryCountItemRequest $request, InventoryCount $inventory, int $item, ManageInventoryCount $action): RedirectResponse
    {
        $action->save($inventory, $item, $request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Contagem salva. O estoque ainda não foi alterado.']);

        return to_route('inventory.show', $inventory);
    }

    public function refreshItem(Request $request, InventoryCount $inventory, int $item, ManageInventoryCount $action): RedirectResponse
    {
        Gate::authorize('create', StockMovement::class);
        $data = $request->validate(['version' => ['required', 'integer', 'min:1']]);
        $action->refreshItem($inventory, $item, (int) $data['version']);

        return to_route('inventory.show', $inventory);
    }

    public function confirm(Request $request, InventoryCount $inventory, ManageInventoryCount $action): RedirectResponse
    {
        Gate::authorize('create', StockMovement::class);
        $data = $request->validate(['version' => ['required', 'integer', 'min:1']]);
        $action->confirm($inventory, (int) $data['version'], $request->user());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Balanço confirmado. Ajustes registrados no histórico.']);

        return to_route('inventory.show', $inventory);
    }

    public function cancel(Request $request, InventoryCount $inventory, ManageInventoryCount $action): RedirectResponse
    {
        Gate::authorize('create', StockMovement::class);
        $data = $request->validate(['version' => ['required', 'integer', 'min:1']]);
        $action->cancel($inventory, (int) $data['version']);

        return to_route('inventory.show', $inventory);
    }
}
