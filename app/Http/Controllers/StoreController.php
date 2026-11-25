<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Http\Requests\StoreDirectoryRequest;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Store;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class StoreController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();

        $completedOrders = Order::query()->where('status', OrderStatus::Completed);
        $completedItems = OrderItem::query()
            ->joinSub($completedOrders->select(['id', 'store_id']), 'completed_orders', 'completed_orders.id', '=', 'order_items.order_id');
        $totals = (clone $completedItems)
            ->select('completed_orders.store_id')
            ->selectRaw('SUM(order_items.total_quantity) as shipped_quantity')
            ->groupBy('completed_orders.store_id');

        $stores = Store::query()
            ->leftJoinSub($totals, 'shipping', 'shipping.store_id', '=', 'stores.id')
            ->when($search !== '', fn ($query) => $query->where('name_key', 'like', '%'.Store::nameKey($search).'%'))
            ->orderBy('name')
            ->paginate(15, ['stores.*', 'shipping.shipped_quantity'])
            ->withQueryString()
            ->through(fn (Store $store): array => [
                'id' => $store->id,
                'name' => $store->name,
                'is_active' => $store->is_active,
                'shipped_quantity' => (int) $store->getAttribute('shipped_quantity'),
            ]);

        return Inertia::render('stores/index', [
            'stores' => $stores,
            'search' => $search,
            'unlinkedQuantity' => (int) $completedItems->whereNull('completed_orders.store_id')->sum('order_items.total_quantity'),
        ]);
    }

    public function store(StoreDirectoryRequest $request): RedirectResponse
    {
        try {
            Store::create($request->validated());
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['name' => 'Já existe uma loja com esse nome.']);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Loja cadastrada.', 'position' => 'top-center']);

        return to_route('stores.index');
    }

    public function update(StoreDirectoryRequest $request, Store $store): RedirectResponse
    {
        try {
            $store->update($request->validated());
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['name' => 'Já existe uma loja com esse nome.']);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Loja atualizada.', 'position' => 'top-center']);

        return to_route('stores.index');
    }
}
