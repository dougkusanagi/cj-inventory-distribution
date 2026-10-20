<?php

use App\Enums\StockOfferType;
use App\Models\Product;
use App\Models\StockOfferVolume;
use Inertia\Testing\AssertableInertia as Assert;

test('the home route renders the public catalog with available stock', function () {
    $product = Product::factory()->create(['name' => 'Produto na tela inicial']);
    $product->update(['stock_offer_type' => StockOfferType::Replenishment]);
    $volume = StockOfferVolume::factory()->for($product)->withTotal(8)->create();

    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('catalog')
            ->has('products.data', 1)
            ->where('products.data.0.id', $product->id)
            ->where('products.data.0.volumes.0.id', $volume->id));
});
