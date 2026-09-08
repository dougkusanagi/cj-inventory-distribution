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

        $availableOffers = StockOffer::query()->availableForCatalog();
        $availableOffersForStats = (clone $availableOffers)
            ->with('stockVolumes:id,stock_offer_id,total_quantity')
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
                'activeOffers' => (clone $availableOffers)->distinct('product_id')->count('product_id'),
                'stockUnits' => (int) $availableOffersForStats->sum(
                    fn (StockOffer $offer): int => (int) $offer->stockVolumes->sum('total_quantity'),
                ),
            ],
        ]);
    }
}
