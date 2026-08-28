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
    $product->variants()->create(['size' => 'M', 'sort_order' => 0]);
    $product->addMedia(UploadedFile::fake()->image('shirt.jpg'))
        ->toMediaCollection(Product::MEDIA_COLLECTION);
    $product->offers()->create([
        'type' => StockOfferType::NewGrade,
        'total_quantity' => 12,
        'is_active' => true,
    ]);
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
