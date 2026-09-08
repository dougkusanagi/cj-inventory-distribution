<?php

use App\Enums\StockOfferType;
use App\Models\Product;
use Illuminate\Support\Facades\Schema;

test('physical sacks keep independent totals and sizes after the cutover', function () {
    $product = Product::factory()->create();
    $offer = $product->offers()->create([
        'type' => StockOfferType::NewGrade,
        'is_active' => true,
    ]);
    $firstVolume = $offer->stockVolumes()->create(['sort_order' => 0, 'total_quantity' => 12]);
    $secondVolume = $offer->stockVolumes()->create(['sort_order' => 1, 'total_quantity' => 20]);
    $firstVolume->items()->create(['size' => 'M', 'is_active' => true, 'quantity' => 12]);
    $secondVolume->items()->create(['size' => 'G', 'is_active' => false, 'quantity' => null]);

    $offer->load('stockVolumes.items');

    expect($offer->calculatedTotalQuantity())->toBe(32);
    expect($offer->calculatedVolumeCount())->toBe(2);
    expect($offer->stockVolumes->pluck('total_quantity')->all())->toBe([12, 20]);
    expect($offer->stockVolumes->pluck('items')->flatten()->pluck('size')->all())->toBe(['M', 'G']);
});

test('physical sack totals remain independent from their size quantities', function () {
    $product = Product::factory()->create();
    $offer = $product->offers()->create([
        'type' => StockOfferType::Replenishment,
        'is_active' => true,
    ]);
    $volume = $offer->stockVolumes()->create(['total_quantity' => 999]);
    $volume->items()->createMany([
        ['size' => '36', 'is_active' => true, 'quantity' => 4],
        ['size' => '38', 'is_active' => true, 'quantity' => 6],
        ['size' => '40', 'is_active' => false, 'quantity' => null],
    ]);

    expect($offer->fresh()->calculatedTotalQuantity())->toBe(999);
    expect($volume->fresh()->items()->where('is_active', true)->sum('quantity'))->toBe(10);
});

test('the database contains only the canonical stock schema', function () {
    expect(Schema::hasColumn('stock_offers', 'type'))->toBeTrue();
    expect(Schema::hasColumn('stock_offers', 'is_active'))->toBeTrue();
    expect(Schema::hasTable('stock_offer_volumes'))->toBeTrue();
    expect(Schema::hasTable('stock_offer_volume_items'))->toBeTrue();
});
