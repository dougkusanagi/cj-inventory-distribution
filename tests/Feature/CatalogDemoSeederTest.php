<?php

use App\Enums\ProductLine;
use App\Enums\StockOfferType;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockOffer;
use Database\Seeders\CatalogDemoSeeder;
use Database\Seeders\FullSizeCatalogDemoSeeder;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('seeds a repeatable catalog demo with classified products and physical sacks', function () {
    Storage::fake('public');

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
        ->and($product->latestOffer->stockVolumes->first()->items->pluck('size')->all())->toBe(['34', '36', '38', '40', '42', '44', '46'])
        ->and($product->latestOffer->stockVolumes->first()->items->pluck('quantity')->all())->toBe([4, 4, 4, 4, 4, null, null])
        ->and($product->getMedia(Product::MEDIA_COLLECTION))->toHaveCount(2)
        ->and($product->getFirstMedia(Product::MEDIA_COLLECTION)?->file_name)->toBe('calca-wide-leg.png');

    $newGrade = Product::query()
        ->with('latestOffer')
        ->where('code', 'DEMO-CJ-0008')
        ->firstOrFail();

    expect($newGrade->latestOffer->type)->toBe(StockOfferType::NewGrade);

    $letterProduct = Product::query()
        ->with('latestOffer.stockVolumes.items')
        ->where('code', 'DEMO-CJ-0004')
        ->firstOrFail();

    expect($letterProduct->latestOffer->stockVolumes->first()->items->pluck('size')->all())
        ->toBe(['PP', 'P', 'M', 'G', 'GG']);

    $skirt = Product::query()->where('code', 'DEMO-CJ-0007')->firstOrFail();

    expect($skirt->getMedia(Product::MEDIA_COLLECTION))
        ->toHaveCount(1)
        ->and($skirt->getFirstMedia(Product::MEDIA_COLLECTION)?->file_name)
        ->toBe('saia-midi.png');

    $shortMom = Product::query()->where('code', 'DEMO-CJ-0003')->firstOrFail();

    expect($shortMom->getMedia(Product::MEDIA_COLLECTION))
        ->toHaveCount(1)
        ->and($shortMom->getFirstMedia(Product::MEDIA_COLLECTION)?->file_name)
        ->toBe('short-mom.png');
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

test('the complete size demo is repeatable and visible in the public catalog', function () {
    Storage::fake('public');

    $this->seed(CatalogDemoSeeder::class);
    $this->seed(FullSizeCatalogDemoSeeder::class);
    $this->seed(FullSizeCatalogDemoSeeder::class);

    expect(Product::query()->where('code', 'DEMO-CJ-0009')->count())->toBe(1);

    $this->get(route('catalog', ['search' => '34 a 46']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('products.data', 1)
            ->where('products.data.0.name', 'Calça Jeans 34 a 46')
            ->where('products.data.0.volumes.0.pieces', 14)
            ->where('products.data.0.volumes.0.sizes', array_map(
                fn (string $size): array => ['size' => $size, 'quantity' => 2],
                ['34', '36', '38', '40', '42', '44', '46'],
            )));
});
