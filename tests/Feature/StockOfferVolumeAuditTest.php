<?php

use App\Enums\StockOfferType;
use App\Models\Product;
use Illuminate\Support\Facades\Artisan;

test('the stock sack audit succeeds when every active offer has a physical sack', function () {
    $product = Product::factory()->create();
    $offer = $product->offers()->create([
        'type' => StockOfferType::NewGrade,
        'total_quantity' => 12,
        'is_active' => true,
    ]);
    $offer->stockVolumes()->createMany([
        ['sort_order' => 0, 'total_quantity' => 5],
        ['sort_order' => 1, 'total_quantity' => 7],
    ]);

    $exitCode = Artisan::call('stock-offers:audit-volumes', ['--json' => true]);
    $report = json_decode(Artisan::output(), true);

    expect($exitCode)->toBe(0);
    expect($report['summary'])->toMatchArray([
        'offer_count' => 1,
        'offers_with_physical_volumes' => 1,
        'offers_without_physical_volumes' => 0,
        'active_offers_without_physical_volumes' => 0,
    ]);
    expect($report['issues'])->toBe([]);
});

test('the stock sack audit reports active offers without a physical sack', function () {
    $missingVolumeProduct = Product::factory()->create();
    $missingVolumeProduct->offers()->create([
        'type' => StockOfferType::NewGrade,
        'is_active' => true,
    ]);

    $pendingProduct = Product::factory()->create();
    $pendingOffer = $pendingProduct->offers()->create([
        'type' => StockOfferType::Replenishment,
        'is_active' => true,
    ]);
    $pendingOffer->stockVolumes()->create([
        'sort_order' => 0,
        'total_quantity' => 8,
    ]);

    $exitCode = Artisan::call('stock-offers:audit-volumes', ['--json' => true]);
    $report = json_decode(Artisan::output(), true);

    expect($exitCode)->toBe(1);
    expect($report['summary'])->toMatchArray([
        'offer_count' => 2,
        'offers_with_physical_volumes' => 1,
        'offers_without_physical_volumes' => 1,
        'active_offers_without_physical_volumes' => 1,
    ]);
    expect($report['issues'])->toHaveCount(1);
    expect($report['issues'][0]['issue'])->toBe('missing_physical_volumes');
    expect($report['issues'][0]['offer_id'])->toBe($missingVolumeProduct->latestOffer->id);
});
