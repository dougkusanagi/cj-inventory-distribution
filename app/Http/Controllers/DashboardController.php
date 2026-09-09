<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\StockOffer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display operational metrics separately from the product catalog.
     */
    public function index(): Response
    {
        Gate::authorize('viewAny', Product::class);

        $activeStockOffers = StockOffer::query()
            ->where('is_active', true)
            ->whereHas('product', fn (Builder $query) => $query->where('is_active', true))
            ->whereHas('stockVolumes', fn (Builder $query) => $query
                ->where('total_quantity', '>', 0)
                ->whereNull('consumed_at'));
        $activeStockOffersForStats = (clone $activeStockOffers)
            ->with(['stockVolumes' => fn ($query) => $query
                ->select(['id', 'stock_offer_id', 'total_quantity'])
                ->whereNull('consumed_at')])
            ->get();

        return Inertia::render('dashboard', [
            'stats' => [
                'total' => Product::query()->count(),
                'withPhotos' => Product::query()
                    ->whereHas('media', fn (Builder $query): Builder => $query->where('collection_name', Product::MEDIA_COLLECTION))
                    ->count(),
                'withSizes' => Product::query()
                    ->whereHas('offers.stockVolumes.items')
                    ->count(),
                'activeOffers' => (clone $activeStockOffers)->distinct('product_id')->count('product_id'),
                'stockUnits' => (int) $activeStockOffersForStats->sum(
                    fn (StockOffer $offer): int => (int) $offer->stockVolumes->sum('total_quantity'),
                ),
            ],
        ]);
    }
}
