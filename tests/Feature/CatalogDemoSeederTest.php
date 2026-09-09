<?php

use App\Enums\ProductLine;
use App\Enums\StockOfferType;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockOffer;
use Database\Seeders\CatalogDemoSeeder;

test('seeds a repeatable catalog demo with classified products and physical sacks', function () {
    $this->seed(CatalogDemoSeeder::class);
    $this->seed(CatalogDemoSeeder::class);

    expect(Category::query()->count())->toBe(6)
        ->and(Product::query()->where('code', 'like', 'DEMO-CJ-%')->count())->toBe(8)
        ->and(StockOffer::query()->whereHas('product', fn ($query) => $query->where('code', 'like', 'DEMO-CJ-%'))->count())->toBe(8);

    $product = Product::query()
        ->with(['category', 'latestOffer.stockVolumes.items'])
        ->where('code', 'DEMO-CJ-0001')
        ->firstOrFail();

    expect($product->category->slug)->toBe('calca')
        ->and($product->line)->toBe(ProductLine::Slim)
        ->and($product->latestOffer->type)->toBe(StockOfferType::Replenishment)
        ->and($product->latestOffer->calculatedTotalQuantity())->toBe(38)
        ->and($product->latestOffer->stockVolumes->pluck('total_quantity')->all())->toBe([20, 18])
        ->and($product->latestOffer->stockVolumes->first()->items->pluck('quantity')->all())->toBe([4, 4, 4, 4, 4]);

    $newGrade = Product::query()
        ->with('latestOffer')
        ->where('code', 'DEMO-CJ-0008')
        ->firstOrFail();

    expect($newGrade->latestOffer->type)->toBe(StockOfferType::NewGrade);
});

test('product and category factories expose catalog classifications', function () {
    $category = Category::factory()->create();

    $slimProduct = Product::factory()
        ->inCategory($category)
        ->slim()
        ->create();
    $plusProduct = Product::factory()->plus()->create();

    expect($slimProduct->category->is($category))->toBeTrue()
        ->and($slimProduct->line)->toBe(ProductLine::Slim)
        ->and($plusProduct->line)->toBe(ProductLine::Plus);
});
