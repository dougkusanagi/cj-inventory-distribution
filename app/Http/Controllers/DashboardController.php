<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Product;
use App\Models\StockOfferVolume;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display operational metrics separately from the product catalog.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        if (! $request->user()?->isStaff()) {
            return to_route('product-photos.index');
        }

        Gate::authorize('viewAny', Product::class);

        $trackedPhysicalStock = StockOfferVolume::query()
            ->where('total_quantity', '>', 0)
            ->whereNull('consumed_at')
            ->whereHas('product', fn (Builder $query) => $query->where('is_active', true));

        return Inertia::render('dashboard', [
            'stats' => [
                'total' => Product::query()->count(),
                'withPhotos' => Product::query()
                    ->whereHas('media', fn (Builder $query): Builder => $query->where('collection_name', Product::MEDIA_COLLECTION))
                    ->count(),
                'withSizes' => Product::query()
                    ->whereHas('stockVolumes.items')
                    ->count(),
                'activeOffers' => Product::query()
                    ->where('is_active', true)
                    ->whereHas('stockVolumes', fn (Builder $query) => $query
                        ->where('total_quantity', '>', 0)
                        ->whereNull('current_order_id')
                        ->whereNull('consumed_at'))
                    ->count(),
                'stockUnits' => (int) (clone $trackedPhysicalStock)
                    ->whereNull('current_order_id')
                    ->sum('total_quantity'),
                'reservedStockUnits' => (int) (clone $trackedPhysicalStock)
                    ->whereNotNull('current_order_id')
                    ->sum('total_quantity'),
                'pendingOrders' => Order::query()->where('status', OrderStatus::Pending)->count(),
                'ordersWithDivergences' => Order::query()
                    ->where('status', OrderStatus::Pending)
                    ->whereHas('items', fn (Builder $query) => $query
                        ->whereNotNull('divergence_note')
                        ->whereNull('divergence_resolved_at'))
                    ->count(),
            ],
        ]);
    }
}
