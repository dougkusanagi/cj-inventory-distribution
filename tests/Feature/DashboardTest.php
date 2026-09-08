<?php

use App\Enums\StockOfferType;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();
    $product->addMedia(UploadedFile::fake()->image('shirt.jpg'))
        ->toMediaCollection(Product::MEDIA_COLLECTION);
    $offer = $product->offers()->create([
        'type' => StockOfferType::NewGrade,
        'is_active' => true,
    ]);
    $volume = $offer->stockVolumes()->create(['total_quantity' => 12]);
    $volume->items()->create(['size' => 'M', 'is_active' => true]);
    $this->actingAs($user);

    $this->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('stats.total', 1)
            ->where('stats.withPhotos', 1)
            ->where('stats.withSizes', 1)
            ->where('stats.activeOffers', 1)
            ->where('stats.stockUnits', 12),
        );
});

test('dashboard stock units are summed from physical sacks', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();
    $offer = $product->offers()->create([
        'type' => StockOfferType::NewGrade,
        'is_active' => true,
    ]);
    $firstVolume = $offer->stockVolumes()->create([
        'sort_order' => 0,
        'total_quantity' => 4,
    ]);
    $secondVolume = $offer->stockVolumes()->create([
        'sort_order' => 1,
        'total_quantity' => 6,
    ]);
    $firstVolume->items()->create(['size' => 'P', 'sort_order' => 0]);
    $secondVolume->items()->create(['size' => 'M', 'sort_order' => 0]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('stats.total', 1)
            ->where('stats.withSizes', 1)
            ->where('stats.activeOffers', 1)
            ->where('stats.stockUnits', 10),
        );
});
