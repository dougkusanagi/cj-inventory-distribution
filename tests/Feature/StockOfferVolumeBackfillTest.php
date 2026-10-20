<?php

use App\Enums\StockOfferType;
use App\Models\Product;
use Illuminate\Support\Facades\Schema;

test('physical sacks keep independent totals and sizes after the cutover', function () {
    $product = Product::factory()->create();
    $product->update(['stock_offer_type' => StockOfferType::NewGrade]);
    $firstVolume = $product->stockVolumes()->create(['sort_order' => 0, 'total_quantity' => 12]);
    $secondVolume = $product->stockVolumes()->create(['sort_order' => 1, 'total_quantity' => 20]);
    $firstVolume->items()->create(['size' => 'M', 'is_active' => true, 'quantity' => 12]);
    $secondVolume->items()->create(['size' => 'G', 'is_active' => false, 'quantity' => null]);

    $product->load('stockVolumes.items');

    expect($product->stockVolumes->sum('total_quantity'))->toBe(32);
    expect($product->stockVolumes)->toHaveCount(2);
    expect($product->stockVolumes->pluck('total_quantity')->all())->toBe([12, 20]);
    expect($product->stockVolumes->pluck('items')->flatten()->pluck('size')->all())->toBe(['M', 'G']);
});

test('physical sack totals remain independent from their size quantities', function () {
    $product = Product::factory()->create();
    $product->update(['stock_offer_type' => StockOfferType::Replenishment]);
    $volume = $product->stockVolumes()->create(['total_quantity' => 999]);
    $volume->items()->createMany([
        ['size' => '36', 'is_active' => true, 'quantity' => 4],
        ['size' => '38', 'is_active' => true, 'quantity' => 6],
        ['size' => '40', 'is_active' => false, 'quantity' => null],
    ]);

    expect($product->stockVolumes()->sum('total_quantity'))->toBe(999);
    expect($volume->fresh()->items()->where('is_active', true)->sum('quantity'))->toBe(10);
});

test('the database contains only the canonical stock schema', function () {
    expect(Schema::hasTable('stock_offers'))->toBeFalse();
    expect(Schema::hasColumn('products', 'stock_offer_type'))->toBeTrue();
    expect(Schema::hasColumn('stock_offer_volumes', 'product_id'))->toBeTrue();
    expect(Schema::hasTable('stock_offer_volumes'))->toBeTrue();
    expect(Schema::hasTable('stock_offer_volume_items'))->toBeTrue();
});
