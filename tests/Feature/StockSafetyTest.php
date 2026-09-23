<?php

use App\Models\Product;
use App\Models\StockOffer;
use App\Models\StockOfferVolume;
use Inertia\Testing\AssertableInertia as Assert;

test('the public catalog keeps unknown size quantities distinct from zero', function () {
    $product = Product::factory()->create();
    $offer = StockOffer::factory()->replenishment()->for($product)->create();
    $volume = StockOfferVolume::factory()->for($offer)->withTotal(7)->create();
    $volume->items()->create([
        'size' => 'M',
        'sort_order' => 0,
        'is_active' => true,
        'quantity' => null,
    ]);
    $volume->items()->create([
        'size' => 'G',
        'sort_order' => 1,
        'is_active' => true,
        'quantity' => 0,
    ]);

    $this->get(route('catalog'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('catalog')
            ->where('products.data.0.volumes.0.pieces', 7)
            ->where('products.data.0.volumes.0.sizes.0.quantity', null)
            ->where('products.data.0.volumes.0.sizes.1.quantity', 0));
});
