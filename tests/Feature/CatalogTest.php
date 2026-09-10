<?php

use App\Models\Product;
use App\Models\StockOffer;
use App\Models\StockOfferVolume;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('renders database products with available stock in the public catalog', function () {
    $product = Product::factory()->plus()->create([
        'name' => 'Produto persistido',
        'code' => 'CJ-BANCO',
    ]);
    $offer = StockOffer::factory()->replenishment()->for($product)->create();
    $volume = StockOfferVolume::factory()->for($offer)->withTotal(12)->create();
    $volume->items()->create([
        'size' => 'M',
        'sort_order' => 0,
        'is_active' => true,
        'quantity' => 12,
    ]);

    $response = $this->get(route('catalog'));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('catalog')
        ->has('products', 1)
        ->where('products.0.name', 'Produto persistido')
        ->where('products.0.code', 'CJ-BANCO')
        ->where('products.0.type', 'Reposição')
        ->where('products.0.volumes.0.pieces', 12)
        ->where('products.0.volumes.0.sizes', ['M'])
    );
});

test('does not expose new grade products in the public catalog', function () {
    $product = Product::factory()->create();
    $offer = StockOffer::factory()->for($product)->create();
    StockOfferVolume::factory()->for($offer)->withTotal(10)->create();

    $response = $this->get(route('catalog'));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('catalog')
        ->has('products', 0)
    );
});

test('catalog uses the configured public URL for product images', function () {
    Storage::fake('public');
    config(['filesystems.disks.public.url' => 'https://inventario.cronicasjeans.com.br/storage']);

    $product = Product::factory()->create(['name' => 'Produto com foto']);
    $offer = StockOffer::factory()->replenishment()->for($product)->create();
    StockOfferVolume::factory()->for($offer)->withTotal(12)->create();
    $media = $product->addMedia(UploadedFile::fake()->image('product.jpg'))
        ->toMediaCollection(Product::MEDIA_COLLECTION);

    $this->get(route('catalog'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('products.0.image', $media->getUrl('thumb')),
        );
});
