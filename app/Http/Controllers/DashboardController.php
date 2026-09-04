<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\StockOffer;
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

        return Inertia::render('dashboard', [
            'stats' => [
                'total' => Product::query()->count(),
                'withPhotos' => Product::query()
                    ->whereHas('media', fn ($query) => $query->where('collection_name', Product::MEDIA_COLLECTION))
                    ->count(),
                'withSizes' => Product::query()->has('variants')->count(),
                'activeOffers' => (clone $availableOffers)->distinct('product_id')->count('product_id'),
                'stockUnits' => (int) $availableOffers->sum('total_quantity'),
            ],
        ]);
    }
}
