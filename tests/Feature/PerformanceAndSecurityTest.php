<?php

use App\Enums\StockOfferType;
use App\Models\Product;
use App\Models\StockOfferVolume;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

test('unverified panel users must verify their email before reading protected data', function () {
    $this->actingAs(User::factory()->unverified()->create())
        ->get(route('products.index'))
        ->assertRedirect(route('verification.notice'));
});

test('product listing query count stays constant when a product has more sacks', function () {
    $this->actingAs(User::factory()->create());
    $product = Product::factory()->create();
    $product->update(['stock_offer_type' => StockOfferType::Replenishment]);
    StockOfferVolume::factory()->for($product)->withTotal(4)->create();

    DB::enableQueryLog();
    $this->get(route('products.index'))->assertOk();
    $initialCount = count(DB::getQueryLog());
    DB::disableQueryLog();
    StockOfferVolume::factory()->count(20)->for($product)->withTotal(4)->create();
    DB::enableQueryLog();
    DB::flushQueryLog();

    $this->get(route('products.index'))->assertOk();
    $expandedCount = count(DB::getQueryLog());
    DB::disableQueryLog();

    expect($expandedCount)->toBe($initialCount);
});

test('product screens preserve historical totals without loading consumed sacks', function (string $screen, string $prefix) {
    $product = Product::factory()->create();
    $product->update(['stock_offer_type' => StockOfferType::Replenishment]);
    StockOfferVolume::factory()->for($product)->withTotal(5)->create();
    StockOfferVolume::factory()->count(30)->for($product)->withTotal(3)->create(['consumed_at' => now()]);
    $product->update(['stock_offer_type' => StockOfferType::NewGrade]);

    $this->actingAs(User::factory()->create())
        ->get(route($screen, $screen === 'products.edit' ? $product : []))
        ->assertInertia(fn (Assert $page) => $page
            ->where($prefix.'.total_quantity', 95)
            ->where($prefix.'.consumed_quantity', 90)
            ->where($prefix.'.stock_volume_count', 31)
            ->where($prefix.'.available_quantity', 5)
            ->where($prefix.'.stock_offer_type', StockOfferType::NewGrade->value)
            ->has($prefix.'.stock_volumes', 1));
})->with([
    'listing' => ['products.index', 'products.data.0'],
    'editing' => ['products.edit', 'product'],
]);

test('product uploads reject excessive pixel dimensions before storing files', function () {
    $this->actingAs(User::factory()->create())
        ->post(route('products.store'), [
            'name' => 'Foto com dimensões excessivas',
            'images' => [UploadedFile::fake()->image('wide.png', Product::MAX_IMAGE_INPUT_DIMENSION + 1, 1)],
        ])
        ->assertInvalid(['images.0' => 'Cada foto deve ter no máximo '.Product::MAX_IMAGE_INPUT_DIMENSION.' pixels de largura e altura.']);

    $this->assertDatabaseEmpty('products');
    $this->assertDatabaseEmpty('media');
});

test('catalog order session limits also apply to requests spread over the hour', function () {
    $this->freezeTime();
    $this->withCredentials()->withCookie(config('session.cookie'), Str::random(40));
    foreach (range(1, 10) as $attempt) {
        $this->postJson(route('catalog-orders.store'), [])->assertUnprocessable();
        $this->travel(2)->minutes();
    }

    $this->postJson(route('catalog-orders.store'), [])->assertTooManyRequests();
    $this->assertDatabaseEmpty('orders');
});

test('catalog order hourly IP limits survive session rotation', function () {
    $this->freezeTime();
    foreach (range(1, 30) as $attempt) {
        session()->invalidate();
        $this->postJson(route('catalog-orders.store'), [])->assertUnprocessable();
        $this->travel(61)->seconds();
    }

    session()->invalidate();
    $this->postJson(route('catalog-orders.store'), [])->assertTooManyRequests();
    $this->assertDatabaseEmpty('orders');
});

test('photo updates do not acquire the global stock lock', function () {
    Storage::fake('public');
    $product = Product::factory()->create();
    $this->actingAs(User::factory()->marketing()->create());
    DB::enableQueryLog();

    $this->put(route('product-photos.update', $product), [
        'images' => [UploadedFile::fake()->image('photo.jpg')],
    ])->assertSessionHasNoErrors()->assertRedirect();

    $globalStockLocks = collect(DB::getQueryLog())
        ->filter(fn (array $query): bool => str_contains($query['query'], 'stock_mutation_lock'));
    DB::disableQueryLog();
    expect($globalStockLocks)->toBeEmpty();
    expect($product->fresh()->getMedia(Product::MEDIA_COLLECTION))->toHaveCount(1);
});
