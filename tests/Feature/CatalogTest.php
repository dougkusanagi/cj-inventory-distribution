<?php

use App\Models\CatalogSetting;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\StockOffer;
use App\Models\StockOfferVolume;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('renders database products with available stock in the public catalog', function () {
    CatalogSetting::factory()->create();
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
        ->where('canPlaceOrder', true)
        ->has('products.data', 1)
        ->where('products.data.0.name', 'Produto persistido')
        ->where('products.data.0.code', 'CJ-BANCO')
        ->where('products.data.0.type', 'Reposição')
        ->where('products.data.0.volumes.0.pieces', 12)
        ->where('products.data.0.volumes.0.sizes', [[
            'size' => 'M',
            'quantity' => 12,
        ]])
    );
});

test('catalog renders the latest available offer instead of an older exhausted offer', function () {
    $product = Product::factory()->create(['name' => 'Produto com histórico']);
    $exhaustedOffer = StockOffer::factory()->replenishment()->for($product)->create();
    StockOfferVolume::factory()->for($exhaustedOffer)->withTotal(0)->create();
    $availableOffer = StockOffer::factory()->brokenGrade()->for($product)->create();
    $availableVolume = StockOfferVolume::factory()->for($availableOffer)->withTotal(7)->create();

    $this->get(route('catalog'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('products.data', 1)
            ->where('products.data.0.type', 'Grade Furada')
            ->where('products.data.0.volumes.0.id', $availableVolume->id)
            ->where('products.data.0.volumes.0.pieces', 7));
});

test('disables catalog checkout until a WhatsApp destination is configured', function () {
    $this->get(route('catalog'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('catalog')
            ->where('canPlaceOrder', false));
});

test('does not expose new grade products in the public catalog', function () {
    $product = Product::factory()->create();
    $offer = StockOffer::factory()->for($product)->create();
    StockOfferVolume::factory()->for($offer)->withTotal(10)->create();

    $response = $this->get(route('catalog'));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('catalog')
        ->has('products.data', 0)
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
            ->where('products.data.0.image', $media->getUrl('thumb')),
        );
});

test('catalog exposes every product image in display order', function () {
    Storage::fake('public');

    $product = Product::factory()->create(['name' => 'Produto com galeria']);
    $offer = StockOffer::factory()->replenishment()->for($product)->create();
    StockOfferVolume::factory()->for($offer)->withTotal(12)->create();
    $firstMedia = $product->addMedia(UploadedFile::fake()->image('first.jpg'))
        ->toMediaCollection(Product::MEDIA_COLLECTION);
    $secondMedia = $product->addMedia(UploadedFile::fake()->image('second.jpg'))
        ->toMediaCollection(Product::MEDIA_COLLECTION);

    $this->get(route('catalog'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('products.data.0.image', $firstMedia->getUrl('thumb'))
            ->where('products.data.0.images', [
                $firstMedia->getUrl('thumb'),
                $secondMedia->getUrl('thumb'),
            ]),
        );
});

test('catalog filters and paginates products on the server', function () {
    $category = Category::factory()->create(['name' => 'Calças']);
    $accentedProduct = Product::factory()->create(['name' => 'CALÇA ACENTUADA']);
    $accentedOffer = StockOffer::factory()->replenishment()->for($accentedProduct)->create();
    StockOfferVolume::factory()->for($accentedOffer)->withTotal(4)->create();

    foreach (range(1, 13) as $index) {
        $product = Product::factory()->create([
            'name' => "Calça paginada {$index}",
            'category_id' => $category->id,
            'model' => "MODELO-{$index}",
        ]);
        $offer = StockOffer::factory()->replenishment()->for($product)->create();
        StockOfferVolume::factory()->for($offer)->withTotal(4)->create();
    }

    $this->get(route('catalog', [
        'search' => 'MODELO-13',
        'category' => $category->id,
        'line' => 'all',
    ]))->assertInertia(fn (Assert $page) => $page
        ->has('products.data', 1)
        ->where('products.data.0.model', 'MODELO-13')
        ->where('filters.search', 'MODELO-13')
        ->where('filters.category', $category->id));

    $this->get(route('catalog', ['search' => 'CALCA ACENTUADA']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('products.data', 1)
            ->where('products.data.0.id', $accentedProduct->id));

    $this->get(route('catalog', ['page' => 2]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('products.data', 2)
            ->where('products.meta.current_page', 2)
            ->where('products.meta.last_page', 2)
            ->where('products.meta.next_page_url', null));

    $this->get(route('catalog'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('products.meta.current_page', 1)
            ->where('products.meta.next_page_url', route('catalog', ['page' => 2])));
});

test('catalog search stays within SQLite parser limits with an available offer', function () {
    $product = Product::factory()->create(['name' => 'Teste de busca']);
    $offer = StockOffer::factory()->replenishment()->for($product)->create();
    StockOfferVolume::factory()->for($offer)->withTotal(4)->create();

    $this->get(route('catalog', ['search' => 'teste']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('products.data', 1)
            ->where('products.data.0.id', $product->id));
});

test('catalog keeps selected unavailable sacks identifiable for the bag', function () {
    $product = Product::factory()->create();
    $offer = StockOffer::factory()->replenishment()->for($product)->create();
    $available = StockOfferVolume::factory()->for($offer)->withTotal(4)->create();
    $reserved = StockOfferVolume::factory()->for($offer)->withTotal(5)->create([
        'current_order_id' => Order::factory()->create()->id,
    ]);

    $this->get(route('catalog', ['bag' => [$available->id, $reserved->id]]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('bag.unavailable_volume_ids', [$reserved->id])
            ->where('bag.products.0.volumes.0.id', $available->id)
            ->where('bag.products.0.id', $product->id));
});
