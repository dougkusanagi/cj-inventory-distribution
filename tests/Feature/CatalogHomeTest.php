<?php

use App\Models\Product;
use App\Models\StockOffer;
use App\Models\StockOfferVolume;
use Inertia\Testing\AssertableInertia as Assert;

test('the home route renders the public catalog with available stock', function () {
    $product = Product::factory()->create(['name' => 'Produto na tela inicial']);
    $offer = StockOffer::factory()->replenishment()->for($product)->create();
    $volume = StockOfferVolume::factory()->for($offer)->withTotal(8)->create();

    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('catalog')
            ->has('products.data', 1)
            ->where('products.data.0.id', $product->id)
            ->where('products.data.0.volumes.0.id', $volume->id));
});
