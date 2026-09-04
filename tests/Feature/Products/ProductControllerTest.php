<?php

use App\Enums\StockOfferType;
use App\Models\Product;
use App\Models\StockOffer;
use App\Models\StockOfferVolume;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to login when visiting products', function () {
    $response = $this->get(route('products.index'));

    $response->assertRedirect(route('login'));
});

test('authenticated users can view the product catalog', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create(['name' => 'Calça Wide Leg']);
    $offer = $product->offers()->create([
        'type' => StockOfferType::NewGrade,
        'is_active' => true,
    ]);
    $volume = $offer->stockVolumes()->create([
        'sort_order' => 0,
        'total_quantity' => 0,
    ]);
    $volume->items()->createMany([
        ['size' => '34', 'sort_order' => 0, 'is_active' => false],
        ['size' => '36', 'sort_order' => 1, 'is_active' => false],
    ]);

    $this->actingAs($user)
        ->get(route('products.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('products/index')
            ->where('products.data.0.id', $product->id)
            ->where('products.data.0.stock_volumes.0.items.0.size', '34')
            ->where('products.data.0.images', []),
        );
});

test('product catalog explains when a product is available for distribution', function () {
    $user = User::factory()->create();
    $hiddenProduct = Product::factory()->create(['is_active' => false]);
    $hiddenOffer = $hiddenProduct->offers()->create([
        'type' => StockOfferType::NewGrade,
        'is_active' => true,
    ]);
    $hiddenOffer->stockVolumes()->create(['total_quantity' => 12]);
    $availableProduct = Product::factory()->create();
    $availableOffer = $availableProduct->offers()->create([
        'type' => StockOfferType::NewGrade,
        'is_active' => true,
    ]);
    $availableOffer->stockVolumes()->create(['total_quantity' => 12]);

    $this->actingAs($user)
        ->get(route('products.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('products.data.0.available_for_distribution', false)
            ->where('products.data.0.distribution_status', 'Produto oculto')
            ->where('products.data.1.available_for_distribution', true)
            ->where('products.data.1.distribution_status', 'Disponível para distribuição'),
        );
});

test('product catalog keeps image URLs on the application origin', function () {
    Storage::fake('public');
    config(['filesystems.disks.public.url' => 'http://192.168.10.77:8089/storage']);

    $user = User::factory()->create();
    $product = Product::factory()->create(['name' => 'Produto com foto']);
    $media = $product->addMedia(UploadedFile::fake()->image('product.jpg'))
        ->toMediaCollection(Product::MEDIA_COLLECTION);

    $this->actingAs($user)
        ->get(route('products.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('products.data.0.images.0.url', '/storage/'.$media->getPathRelativeToRoot())
            ->where(
                'products.data.0.images.0.thumb_url',
                '/storage/'.$media->getPathRelativeToRoot('thumb'),
            ),
        );
});

test('authenticated users can open the product forms', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();
    $offer = $product->offers()->create([
        'type' => StockOfferType::NewGrade,
    ]);
    $volume = $offer->stockVolumes()->create(['total_quantity' => 8]);
    $volume->items()->create([
        'size' => 'M',
        'quantity' => 8,
        'is_active' => true,
    ]);

    $this->actingAs($user)
        ->get(route('products.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('products/create'),
        );

    $this->actingAs($user)
        ->get(route('products.edit', $product))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('products/edit')
            ->where('product.id', $product->id)
            ->where('product.stock_volumes.0.items.0.is_active', true)
            ->where('product.stock_volumes.0.items.0.quantity', 8),
        );
});

test('editing a hidden product keeps its stock data available', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();
    $offer = $product->offers()->create([
        'type' => StockOfferType::Replenishment,
        'is_active' => false,
    ]);
    $volume = $offer->stockVolumes()->create(['total_quantity' => 10]);
    $volume->items()->create([
        'size' => 'M',
        'quantity' => 10,
        'is_active' => true,
    ]);

    $this->actingAs($user)
        ->get(route('products.edit', $product))
        ->assertInertia(fn (Assert $page) => $page
            ->where('product.has_stock_offer', false)
            ->where('product.stock_offer_type', StockOfferType::Replenishment->value)
            ->where('product.total_quantity', 10)
            ->where('product.stock_volume_count', 1)
            ->where('product.stock_volumes.0.items.0.is_active', true)
            ->where('product.stock_volumes.0.items.0.quantity', 10),
        );
});

test('authenticated users can create a product with optional model, ordered sizes and stock', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('products.store'), [
        'name' => '  Jaqueta Jeans Oversized  ',
        'model' => '  ',
        'notes' => 'Lavagem média',
        'has_stock_offer' => true,
        'stock_offer_type' => StockOfferType::NewGrade->value,
        'stock_volumes' => [[
            'total_quantity' => 15,
            'items' => [
                ['size' => 'P', 'quantity' => 5, 'is_active' => true],
                ['size' => 'M', 'quantity' => 5, 'is_active' => true],
                ['size' => 'G', 'quantity' => 5, 'is_active' => true],
            ],
        ]],
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $product = Product::query()->with('latestOffer.stockVolumes.items')->sole();

    $this->assertModelExists($product);
    expect($product->code)->toBe('CJ-000001');
    expect($product->name)->toBe('Jaqueta Jeans Oversized');
    expect($product->model)->toBeNull();
    expect($product->latestOffer)->not->toBeNull();
    expect($product->latestOffer->type)->toBe(StockOfferType::NewGrade);
    expect($product->latestOffer->calculatedTotalQuantity())->toBe(15);
    expect($product->latestOffer->stockVolumes->sole()->items->pluck('is_active')->all())
        ->toBe([true, true, true]);
    expect($product->latestOffer->stockVolumes->sole()->items->pluck('quantity')->all())
        ->toBe([5, 5, 5]);
});

test('stock total is calculated from active size quantities', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('products.store'), [
        'name' => 'Calça com estoque por tamanho',
        'stock_volumes' => [[
            'total_quantity' => 999,
            'items' => [
                ['size' => '36', 'quantity' => 0, 'is_active' => true],
                ['size' => '38', 'quantity' => 4, 'is_active' => true],
                ['size' => '40', 'quantity' => 99, 'is_active' => false],
            ],
        ]],
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $product = Product::query()->with('latestOffer.stockVolumes.items')->sole();

    expect($product->latestOffer->calculatedTotalQuantity())->toBe(4);
    expect($product->latestOffer->stockVolumes->sole()->items->pluck('is_active')->all())
        ->toBe([true, true, false]);
    expect($product->latestOffer->stockVolumes->sole()->items->pluck('quantity')->all())
        ->toBe([0, 4, null]);
});

test('authenticated users can save a product without creating a stock offer', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('products.store'), [
        'name' => 'Produto sem estoque inicial',
        'has_stock_offer' => false,
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $product = Product::query()->with('latestOffer')->sole();

    expect($product->is_active)->toBeTrue();
    expect($product->latestOffer)->toBeNull();
    expect(StockOffer::query()->where('product_id', $product->id)->count())->toBe(0);
});

test('product activation is independent from its stock offer', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();
    $offer = $product->offers()->create([
        'type' => StockOfferType::NewGrade,
        'is_active' => true,
    ]);
    $volume = $offer->stockVolumes()->create([
        'total_quantity' => 10,
    ]);
    $volume->items()->create([
        'size' => 'M',
        'quantity' => 10,
        'is_active' => true,
    ]);

    $response = $this->actingAs($user)->put(route('products.update', $product), [
        'name' => $product->name,
        'is_active' => false,
        'has_stock_offer' => true,
        'stock_offer_type' => StockOfferType::NewGrade->value,
        'stock_volumes' => [[
            'id' => $volume->id,
            'total_quantity' => 10,
            'items' => [[
                'id' => $volume->items()->sole()->id,
                'size' => 'M',
                'quantity' => 10,
                'is_active' => true,
            ]],
        ],
        ],
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    expect($product->fresh()->is_active)->toBeFalse();
    expect($offer->fresh()->is_active)->toBeTrue();
});

test('stock offer type is persisted from the explicit request value', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('products.store'), [
        'name' => 'Reposição de referência',
        'has_stock_offer' => true,
        'stock_offer_type' => StockOfferType::Replenishment->value,
        'stock_volumes' => [[
            'total_quantity' => 12,
            'items' => [['size' => 'M', 'quantity' => 12, 'is_active' => true]],
        ]],
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $product = Product::query()->with('latestOffer')->sole();

    expect($product->latestOffer->type)->toBe(StockOfferType::Replenishment);
    expect($product->latestOffer->stockVolumes()->count())->toBe(1);
});

test('active stock offers require at least one physical sack', function (string $type) {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->from(route('products.create'))
        ->post(route('products.store'), [
            'name' => 'Oferta em sacos',
            'has_stock_offer' => true,
            'stock_offer_type' => $type,
        ]);

    $response
        ->assertSessionHasErrors([
            'stock_volumes' => 'Adicione pelo menos um saco ao estoque.',
        ])
        ->assertRedirect(route('products.create'));

    expect(Product::query()->count())->toBe(0);
})->with([
    'new grade' => StockOfferType::NewGrade->value,
    'replenishment' => StockOfferType::Replenishment->value,
    'broken grade' => StockOfferType::BrokenGrade->value,
]);

test('the shared catalog excludes offers without physical stock', function () {
    $product = Product::factory()->create();
    $availableOffer = $product->offers()->create([
        'type' => StockOfferType::Replenishment,
        'is_active' => true,
    ]);
    $availableOffer->stockVolumes()->create(['total_quantity' => 12]);
    $exhaustedOffer = $product->offers()->create([
        'type' => StockOfferType::Replenishment,
        'is_active' => true,
    ]);
    $exhaustedOffer->stockVolumes()->create(['total_quantity' => 0]);
    $inactiveOffer = $product->offers()->create([
        'type' => StockOfferType::BrokenGrade,
        'is_active' => false,
    ]);
    $inactiveOffer->stockVolumes()->create(['total_quantity' => 12]);
    $newGradeOffer = $product->offers()->create([
        'type' => StockOfferType::NewGrade,
        'is_active' => true,
    ]);
    $newGradeOffer->stockVolumes()->create(['total_quantity' => 12]);
    $zeroStockOffer = $product->offers()->create([
        'type' => StockOfferType::NewGrade,
        'is_active' => true,
    ]);
    $zeroStockOffer->stockVolumes()->create(['total_quantity' => 0]);
    $inactiveProduct = Product::factory()->create(['is_active' => false]);
    $inactiveProductOffer = $inactiveProduct->offers()->create([
        'type' => StockOfferType::NewGrade,
        'is_active' => true,
    ]);
    $inactiveProductOffer->stockVolumes()->create(['total_quantity' => 12]);

    $availableOfferIds = StockOffer::query()
        ->whereBelongsTo($product)
        ->availableForCatalog()
        ->orderBy('id')
        ->pluck('id')
        ->all();

    expect($availableOfferIds)->toBe([$availableOffer->id, $newGradeOffer->id]);
    expect($availableOfferIds)->not->toContain($exhaustedOffer->id);
    expect($availableOfferIds)->not->toContain($inactiveOffer->id);
    expect($availableOfferIds)->not->toContain($zeroStockOffer->id);
    expect(
        StockOffer::query()
            ->availableForCatalog()
            ->whereKey($inactiveProductOffer->getKey())
            ->exists(),
    )->toBeFalse();
    expect($product->fresh()->latestAvailableOffer->is($newGradeOffer))->toBeTrue();
});

test('product creation stores up to five images with thumbnails', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $images = collect(range(1, 5))
        ->map(fn (int $number): UploadedFile => UploadedFile::fake()->image('product-'.$number.'.jpg'))
        ->all();

    $response = $this->actingAs($user)->post(route('products.store'), [
        'name' => 'Produto com galeria',
        'has_stock_offer' => false,
        'images' => $images,
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $product = Product::query()->sole();
    $media = $product->getMedia(Product::MEDIA_COLLECTION);

    expect($media)->toHaveCount(5);
    $media->each(function ($image): void {
        expect($image->hasGeneratedConversion('thumb'))->toBeTrue();
        Storage::disk('public')->assertExists($image->getPathRelativeToRoot('thumb'));
    });
});

test('product creation normalizes the saved image to a bounded WebP', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $image = UploadedFile::fake()->image('product.jpg', 1700, 2125);

    $response = $this->actingAs($user)->post(route('products.store'), [
        'name' => 'Produto com foto normalizada',
        'has_stock_offer' => false,
        'images' => [$image],
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $media = Product::query()->sole()->getFirstMedia(Product::MEDIA_COLLECTION);
    $contents = Storage::disk('public')->get($media->getPathRelativeToRoot());
    $dimensions = getimagesizefromstring($contents);

    expect($media->file_name)->toEndWith('.webp');
    expect($media->mime_type)->toBe('image/webp');
    expect($dimensions[0])->toBe(Product::MAX_IMAGE_WIDTH);
    expect($dimensions[1])->toBe(Product::MAX_IMAGE_HEIGHT);
});

test('product creation accepts source images above five megabytes', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $image = UploadedFile::fake()->image('large-product.jpg')->size(6 * 1024);

    $response = $this->actingAs($user)->post(route('products.store'), [
        'name' => 'Produto com foto grande',
        'has_stock_offer' => false,
        'images' => [$image],
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    expect(Product::query()->sole()->getMedia(Product::MEDIA_COLLECTION))
        ->toHaveCount(1);
});

test('product creation rejects source images above the technical limit', function () {
    $user = User::factory()->create();
    $image = UploadedFile::fake()->image('too-large-product.jpg')->size(26 * 1024);

    $response = $this->actingAs($user)
        ->from(route('products.create'))
        ->post(route('products.store'), [
            'name' => 'Produto com foto muito grande',
            'has_stock_offer' => false,
            'images' => [$image],
        ]);

    $response
        ->assertSessionHasErrors([
            'images.0' => 'Cada foto deve ter no máximo 25 MB.',
        ])
        ->assertRedirect(route('products.create'));

    expect(Product::query()->count())->toBe(0);
});

test('product creation requires a total for a sack with unknown quantities', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->from(route('products.create'))
        ->post(route('products.store'), [
            'name' => 'Calça Mom Básica',
            'has_stock_offer' => true,
            'stock_offer_type' => StockOfferType::NewGrade->value,
            'stock_volumes' => [[
                'total_quantity' => null,
                'items' => [
                    ['size' => '36', 'quantity' => null, 'is_active' => true],
                    ['size' => '38', 'quantity' => null, 'is_active' => false],
                ],
            ]],
        ]);

    $response
        ->assertSessionHasErrors([
            'stock_volumes.0.total_quantity' => 'Informe o total do saco quando nenhuma quantidade por tamanho for conhecida.',
        ])
        ->assertRedirect(route('products.create'));

    expect(Product::query()->count())->toBe(0);
});

test('authenticated users can save which sizes are present without quantities', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('products.store'), [
        'name' => 'Blusa de malha',
        'has_stock_offer' => true,
        'stock_offer_type' => StockOfferType::NewGrade->value,
        'stock_volumes' => [[
            'total_quantity' => 0,
            'items' => [
                ['size' => 'P', 'is_active' => true],
                ['size' => 'M', 'is_active' => false],
                ['size' => 'G', 'is_active' => true],
            ],
        ]],
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $product = Product::query()->with('latestOffer.stockVolumes.items')->sole();

    expect($product->latestOffer)->not->toBeNull();
    expect($product->latestOffer->stockVolumes->sole()->items->pluck('is_active')->all())
        ->toBe([true, false, true]);
    expect($product->latestOffer->stockVolumes->sole()->items->pluck('quantity')->all())
        ->toBe([null, null, null]);
});

test('product creation returns validation errors and does not persist invalid data', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->from(route('products.create'))->post(route('products.store'), [
        'name' => '   ',
        'has_stock_offer' => true,
        'stock_offer_type' => StockOfferType::NewGrade->value,
        'stock_volumes' => [[
            'total_quantity' => -5,
            'items' => [
                ['size' => 'M', 'quantity' => -2, 'is_active' => true],
                ['size' => 'M', 'quantity' => 3, 'is_active' => true],
            ],
        ]],
    ]);

    $response
        ->assertSessionHasErrors([
            'name' => 'Informe o nome do produto.',
            'stock_volumes.0.total_quantity' => 'O total do saco não pode ser negativo.',
            'stock_volumes.0.items.0.quantity' => 'A quantidade do tamanho não pode ser negativa.',
            'stock_volumes.0.items.1.size' => 'Os tamanhos precisam ser diferentes dentro do saco.',
        ])
        ->assertRedirect(route('products.create'));

    expect(Product::query()->count())->toBe(0);
});

test('product creation rejects non-image uploads', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->from(route('products.create'))->post(route('products.store'), [
        'name' => 'Produto com arquivo inválido',
        'has_stock_offer' => false,
        'images' => [
            UploadedFile::fake()->create('manual.txt', 10, 'text/plain'),
        ],
    ]);

    $response
        ->assertSessionHasErrors('images.0')
        ->assertRedirect(route('products.create'));

    expect(Product::query()->count())->toBe(0);
});

test('authenticated users can update product details, sizes and stock without changing its code', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create([
        'name' => 'Nome anterior',
        'model' => '2451',
    ]);
    $originalCode = $product->code;

    $response = $this->actingAs($user)->put(route('products.update', $product), [
        'name' => 'Short Mom',
        'model' => '3002',
        'notes' => 'Nova observação',
        'has_stock_offer' => true,
        'stock_offer_type' => StockOfferType::NewGrade->value,
        'stock_volumes' => [[
            'total_quantity' => 999,
            'items' => [
                ['size' => '36', 'quantity' => 10, 'is_active' => true],
                ['size' => '38', 'quantity' => null, 'is_active' => false],
            ],
        ]],
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $product->refresh();
    expect($product->code)->toBe($originalCode);
    expect($product->name)->toBe('Short Mom');
    expect($product->model)->toBe('3002');
    expect($product->latestOffer->calculatedTotalQuantity())->toBe(10);
    expect($product->latestOffer->stockVolumes->sole()->items->pluck('is_active')->all())
        ->toBe([true, false]);
    expect($product->latestOffer->stockVolumes->sole()->items->pluck('quantity')->all())
        ->toBe([10, null]);
});

test('hiding a product from the catalog preserves its stock data', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();
    $offer = $product->offers()->create([
        'type' => StockOfferType::Replenishment,
        'is_active' => true,
    ]);
    $volume = $offer->stockVolumes()->create(['total_quantity' => 10]);
    $item = $volume->items()->create([
        'size' => 'M',
        'quantity' => 10,
        'is_active' => true,
    ]);

    $response = $this->actingAs($user)->put(route('products.update', $product), [
        'name' => $product->name,
        'has_stock_offer' => false,
        'stock_offer_type' => StockOfferType::Replenishment->value,
        'stock_volumes' => [[
            'id' => $volume->id,
            'total_quantity' => 10,
            'items' => [[
                'id' => $item->id,
                'size' => 'M',
                'quantity' => 10,
                'is_active' => true,
            ]],
        ]],
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $offer->refresh();
    expect($offer->is_active)->toBeFalse();
    expect($offer->stockVolumes()->sole()->total_quantity)->toBe(10);
    expect($offer->stockVolumes()->sole()->items()->sole()->is_active)->toBeTrue();
    expect($offer->stockVolumes()->sole()->items()->sole()->quantity)->toBe(10);
});

test('ending the current stock clears the lot and hides it from the catalog', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();
    $offer = $product->offers()->create([
        'type' => StockOfferType::Replenishment,
        'is_active' => true,
    ]);
    $volume = $offer->stockVolumes()->create(['total_quantity' => 10]);
    $item = $volume->items()->create([
        'size' => 'M',
        'quantity' => 10,
        'is_active' => true,
    ]);

    $response = $this->actingAs($user)->put(route('products.update', $product), [
        'name' => $product->name,
        'has_stock_offer' => false,
        'stock_offer_type' => StockOfferType::Replenishment->value,
        'stock_volumes' => [[
            'id' => $volume->id,
            'total_quantity' => 0,
            'items' => [[
                'id' => $item->id,
                'size' => 'M',
                'quantity' => null,
                'is_active' => false,
            ]],
        ]],
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $offer->refresh();
    expect($offer->is_active)->toBeFalse();
    expect($offer->stockVolumes()->sole()->total_quantity)->toBe(0);
    expect($offer->stockVolumes()->sole()->items()->sole()->is_active)->toBeFalse();
    expect($offer->stockVolumes()->sole()->items()->sole()->quantity)->toBeNull();
});

test('zero stock remains editable but is excluded from the shared catalog', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();
    $offer = $product->offers()->create([
        'type' => StockOfferType::NewGrade,
        'is_active' => true,
    ]);
    $volume = $offer->stockVolumes()->create(['total_quantity' => 10]);
    $item = $volume->items()->create([
        'size' => 'M',
        'quantity' => 10,
        'is_active' => true,
    ]);

    $response = $this->actingAs($user)->put(route('products.update', $product), [
        'name' => $product->name,
        'has_stock_offer' => true,
        'stock_offer_type' => StockOfferType::NewGrade->value,
        'stock_volumes' => [[
            'id' => $volume->id,
            'total_quantity' => 0,
            'items' => [[
                'id' => $item->id,
                'size' => 'M',
                'quantity' => null,
                'is_active' => false,
            ]],
        ]],
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $offer->refresh();
    expect($offer->is_active)->toBeTrue();
    expect($offer->stockVolumes()->sole()->total_quantity)->toBe(0);
    expect($offer->stockVolumes()->sole()->items()->sole()->is_active)->toBeFalse();
    expect($offer->stockVolumes()->sole()->items()->sole()->quantity)->toBeNull();
    expect(
        StockOffer::query()
            ->availableForCatalog()
            ->whereKey($offer->getKey())
            ->exists(),
    )->toBeFalse();
});

test('product images can be replaced and removed from the media collection', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $product = Product::factory()->create();
    $oldMedia = $product->addMedia(UploadedFile::fake()->image('old.jpg'))
        ->toMediaCollection(Product::MEDIA_COLLECTION);
    $oldImagePath = $oldMedia->getPathRelativeToRoot();
    $oldThumbPath = $oldMedia->getPathRelativeToRoot('thumb');

    $replaceResponse = $this->actingAs($user)->post(route('products.update', $product), [
        '_method' => 'PUT',
        'name' => $product->name,
        'has_stock_offer' => false,
        'remove_media_ids' => [$oldMedia->id],
        'images' => [UploadedFile::fake()->image('new.jpg')],
    ]);

    $replaceResponse
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $product->refresh();
    $newMedia = $product->getFirstMedia(Product::MEDIA_COLLECTION);
    expect($newMedia)->not->toBeNull();
    expect($product->getMedia(Product::MEDIA_COLLECTION))->toHaveCount(1);
    Storage::disk('public')->assertMissing($oldImagePath);
    Storage::disk('public')->assertMissing($oldThumbPath);
    Storage::disk('public')->assertExists($newMedia->getPathRelativeToRoot());
    Storage::disk('public')->assertExists($newMedia->getPathRelativeToRoot('thumb'));

    $removeResponse = $this->actingAs($user)->post(route('products.update', $product), [
        '_method' => 'PUT',
        'name' => $product->name,
        'has_stock_offer' => false,
        'remove_media_ids' => [$newMedia->id],
    ]);

    $removeResponse
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    expect($product->refresh()->getMedia(Product::MEDIA_COLLECTION))->toHaveCount(0);
    Storage::disk('public')->assertMissing($newMedia->getPathRelativeToRoot());
    Storage::disk('public')->assertMissing($newMedia->getPathRelativeToRoot('thumb'));
});

test('replacing one image in a full gallery removes only the selected image', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $product = Product::factory()->create();
    $media = collect(range(1, Product::MAX_IMAGES))
        ->map(fn (int $number) => $product
            ->addMedia(UploadedFile::fake()->image('photo-'.$number.'.jpg'))
            ->toMediaCollection(Product::MEDIA_COLLECTION));
    $removedMedia = $media->get(2);
    $retainedMedia = $media->reject(fn ($item) => $item->is($removedMedia))->values();
    $retainedPaths = $retainedMedia
        ->map(fn ($item): string => $item->getPathRelativeToRoot())
        ->all();

    $response = $this->actingAs($user)->post(route('products.update', $product), [
        '_method' => 'PUT',
        'name' => $product->name,
        'has_stock_offer' => false,
        'remove_media_ids' => [$removedMedia->id],
        'images' => [UploadedFile::fake()->image('replacement.jpg')],
        'image_order' => [
            'media:'.$retainedMedia->get(0)->id,
            'new:0',
            'media:'.$retainedMedia->get(1)->id,
            'media:'.$retainedMedia->get(2)->id,
            'media:'.$retainedMedia->get(3)->id,
        ],
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $orderedMedia = $product->refresh()->getMedia(Product::MEDIA_COLLECTION);
    expect($orderedMedia)->toHaveCount(Product::MAX_IMAGES);
    expect($orderedMedia->first()->id)->toBe($retainedMedia->get(0)->id);
    expect($orderedMedia->pluck('id')->all())->not->toContain($removedMedia->id);
    expect($media->pluck('id')->all())->not->toContain($orderedMedia->get(1)->id);
    Storage::disk('public')->assertMissing($removedMedia->getPathRelativeToRoot());

    foreach ($retainedPaths as $path) {
        Storage::disk('public')->assertExists($path);
    }
});

test('replacing any position in a full gallery preserves every other image', function (int $removedIndex) {
    Storage::fake('public');

    $user = User::factory()->create();
    $product = Product::factory()->create();
    $media = collect(range(1, Product::MAX_IMAGES))
        ->map(fn (int $number) => $product
            ->addMedia(UploadedFile::fake()->image('photo-'.$number.'.jpg'))
            ->toMediaCollection(Product::MEDIA_COLLECTION));
    $removedMedia = $media->get($removedIndex);
    $expectedOrder = $media
        ->map(fn ($item, int $index): string => $index === $removedIndex
            ? 'new:0'
            : 'media:'.$item->id)
        ->all();
    $retainedMediaIds = $media
        ->reject(fn ($item): bool => $item->is($removedMedia))
        ->pluck('id')
        ->values()
        ->all();
    $retainedPaths = $media
        ->reject(fn ($item): bool => $item->is($removedMedia))
        ->map(fn ($item): string => $item->getPathRelativeToRoot())
        ->all();

    $response = $this->actingAs($user)->post(route('products.update', $product), [
        '_method' => 'PUT',
        'name' => $product->name,
        'has_stock_offer' => false,
        'remove_media_ids' => [$removedMedia->id],
        'images' => [UploadedFile::fake()->image('replacement.jpg')],
        'image_order' => $expectedOrder,
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $orderedMedia = $product->refresh()->getMedia(Product::MEDIA_COLLECTION);
    $newMedia = $orderedMedia->first(
        fn ($item): bool => ! in_array($item->id, $media->pluck('id')->all(), true),
    );
    $expectedMediaIds = collect($expectedOrder)
        ->map(fn (string $token): int => str_starts_with($token, 'new:')
            ? $newMedia->id
            : (int) substr($token, strlen('media:')))
        ->all();

    expect($orderedMedia)->toHaveCount(Product::MAX_IMAGES);
    expect($orderedMedia->pluck('id')->all())->toBe($expectedMediaIds);
    expect($orderedMedia->pluck('id')->all())->not->toContain($removedMedia->id);
    expect($orderedMedia->filter(fn ($item): bool => $item->id !== $newMedia->id)->pluck('id')->values()->all())
        ->toBe($retainedMediaIds);
    expect($orderedMedia->pluck('order_column')->all())->toBe(range(1, Product::MAX_IMAGES));

    Storage::disk('public')->assertMissing($removedMedia->getPathRelativeToRoot());

    foreach ($retainedPaths as $path) {
        Storage::disk('public')->assertExists($path);
    }
    Storage::disk('public')->assertExists($newMedia->getPathRelativeToRoot());
})->with([
    'cover' => 0,
    'second photo' => 1,
    'middle photo' => 2,
    'fourth photo' => 3,
    'last photo' => 4,
]);

test('invalid stock sack payload cannot erase existing product sizes', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();
    $offer = $product->offers()->create([
        'type' => StockOfferType::NewGrade,
        'is_active' => true,
    ]);
    $volume = $offer->stockVolumes()->create(['total_quantity' => 0]);
    $item = $volume->items()->create([
        'size' => 'M',
        'is_active' => false,
    ]);

    $response = $this->actingAs($user)
        ->from(route('products.edit', $product))
        ->post(route('products.update', $product), [
            '_method' => 'PUT',
            'name' => $product->name,
            'has_stock_offer' => true,
            'stock_offer_type' => StockOfferType::NewGrade->value,
            'stock_volumes' => 'invalid-payload',
        ]);

    $response
        ->assertSessionHasErrors('stock_volumes')
        ->assertRedirect(route('products.edit', $product));

    $this->assertModelExists($item);
    expect($volume->fresh()->items()->pluck('size')->all())->toBe(['M']);
});

test('product images can be reordered with a new image as the principal photo', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $product = Product::factory()->create();
    $firstMedia = $product->addMedia(UploadedFile::fake()->image('first.jpg'))
        ->toMediaCollection(Product::MEDIA_COLLECTION);
    $secondMedia = $product->addMedia(UploadedFile::fake()->image('second.jpg'))
        ->toMediaCollection(Product::MEDIA_COLLECTION);

    $response = $this->actingAs($user)->post(route('products.update', $product), [
        '_method' => 'PUT',
        'name' => $product->name,
        'has_stock_offer' => false,
        'images' => [UploadedFile::fake()->image('principal.jpg')],
        'image_order' => [
            'new:0',
            'media:'.$secondMedia->id,
            'media:'.$firstMedia->id,
        ],
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $orderedMedia = $product->refresh()->getMedia(Product::MEDIA_COLLECTION);
    $orderedIds = $orderedMedia->pluck('id')->all();

    expect($orderedMedia)->toHaveCount(3);
    expect($orderedIds[1])->toBe($secondMedia->id);
    expect($orderedIds[2])->toBe($firstMedia->id);
    expect(in_array($orderedIds[0], [$firstMedia->id, $secondMedia->id], true))->toBeFalse();

    $this->actingAs($user)
        ->get(route('products.edit', $product))
        ->assertInertia(fn (Assert $page) => $page
            ->where('product.images.0.id', $orderedIds[0])
            ->where('product.images.1.id', $secondMedia->id)
            ->where('product.images.2.id', $firstMedia->id),
        );
});

test('product image order cannot reference media from another product', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $product = Product::factory()->create();
    $otherProduct = Product::factory()->create();
    $productMedia = $product->addMedia(UploadedFile::fake()->image('product.jpg'))
        ->toMediaCollection(Product::MEDIA_COLLECTION);
    $otherMedia = $otherProduct->addMedia(UploadedFile::fake()->image('other.jpg'))
        ->toMediaCollection(Product::MEDIA_COLLECTION);

    $response = $this->actingAs($user)
        ->from(route('products.edit', $product))
        ->post(route('products.update', $product), [
            '_method' => 'PUT',
            'name' => $product->name,
            'has_stock_offer' => false,
            'image_order' => [
                'media:'.$otherMedia->id,
                'media:'.$productMedia->id,
            ],
        ]);

    $response
        ->assertSessionHasErrors('image_order')
        ->assertRedirect(route('products.edit', $product));

    expect($product->refresh()->getMedia(Product::MEDIA_COLLECTION)->pluck('id')->all())
        ->toBe([$productMedia->id]);
});

test('authenticated users can delete a product with its stock sacks and media', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $product = Product::factory()->create();
    $media = $product->addMedia(UploadedFile::fake()->image('delete-me.jpg'))
        ->toMediaCollection(Product::MEDIA_COLLECTION);
    $imagePath = $media->getPathRelativeToRoot();
    $thumbPath = $media->getPathRelativeToRoot('thumb');
    $offer = $product->offers()->create([
        'type' => StockOfferType::NewGrade,
        'is_active' => true,
    ]);
    $volume = $offer->stockVolumes()->create(['total_quantity' => 10]);
    $volume->items()->create(['size' => 'M', 'quantity' => 10, 'is_active' => true]);

    $response = $this->actingAs($user)->delete(route('products.destroy', $product));

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $this->assertModelMissing($product);
    $this->assertModelMissing($media);
    expect(StockOffer::query()->where('product_id', $product->id)->exists())->toBeFalse();
    Storage::disk('public')->assertMissing($imagePath);
    Storage::disk('public')->assertMissing($thumbPath);
});

test('authenticated users can create a product with independent stock sacks', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('products.store'), [
        'name' => 'Calça com dois sacos',
        'has_stock_offer' => true,
        'stock_offer_type' => StockOfferType::NewGrade->value,
        'stock_volumes' => [
            [
                'total_quantity' => 999,
                'items' => [
                    ['size' => '36', 'is_active' => true, 'quantity' => 4],
                    ['size' => '38', 'is_active' => true, 'quantity' => 6],
                    ['size' => '40', 'is_active' => false, 'quantity' => 99],
                ],
            ],
            [
                'total_quantity' => 18,
                'items' => [
                    ['size' => 'M', 'is_active' => true, 'quantity' => null],
                    ['size' => 'G', 'is_active' => false, 'quantity' => 8],
                ],
            ],
        ],
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $product = Product::query()->with('latestOffer.stockVolumes.items')->sole();
    $offer = $product->latestOffer;

    expect($offer->type)->toBe(StockOfferType::NewGrade);
    expect($offer->stockVolumes->pluck('total_quantity')->all())->toBe([10, 18]);
    expect($offer->stockVolumes[0]->items->pluck('size')->all())->toBe(['36', '38', '40']);
    expect($offer->stockVolumes[0]->items->pluck('quantity')->all())->toBe([4, 6, null]);
    expect($offer->stockVolumes[1]->items->pluck('quantity')->all())->toBe([null, null]);

    $this->actingAs($user)
        ->get(route('products.edit', $product))
        ->assertInertia(fn (Assert $page) => $page
            ->where('product.stock_volumes.0.total_quantity', 10)
            ->where('product.stock_volumes.0.items.1.size', '38')
            ->where('product.stock_volumes.1.total_quantity', 18)
            ->where('product.stock_volume_count', 2)
            ->where('product.stock_volumes.0.items.0.size', '36')
            ->where('product.stock_volumes.0.items.0.is_active', true)
            ->where('product.stock_volumes.0.items.0.quantity', 4),
        );
});

test('a sack keeps its manual total when its active quantities are unknown', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('products.store'), [
        'name' => 'Saco com contagem manual',
        'has_stock_offer' => true,
        'stock_offer_type' => StockOfferType::Replenishment->value,
        'stock_volumes' => [[
            'total_quantity' => 7,
            'items' => [
                ['size' => 'M', 'is_active' => true, 'quantity' => null],
                ['size' => 'G', 'is_active' => false, 'quantity' => 20],
            ],
        ]],
    ]);

    $response->assertSessionHasNoErrors();

    $offer = Product::query()->with('latestOffer.stockVolumes.items')->sole()->latestOffer;

    expect($offer->stockVolumes->sole()->total_quantity)->toBe(7);
    expect($offer->stockVolumes->sole()->items->pluck('quantity')->all())->toBe([null, null]);
});

test('an active sack requires a manual total when no size quantity is known', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->from(route('products.create'))
        ->post(route('products.store'), [
            'name' => 'Saco sem total',
            'has_stock_offer' => true,
            'stock_offer_type' => StockOfferType::NewGrade->value,
            'stock_volumes' => [[
                'total_quantity' => null,
                'items' => [
                    ['size' => 'M', 'is_active' => true, 'quantity' => null],
                ],
            ]],
        ]);

    $response
        ->assertSessionHasErrors([
            'stock_volumes.0.total_quantity' => 'Informe o total do saco quando nenhuma quantidade por tamanho for conhecida.',
        ])
        ->assertRedirect(route('products.create'));

    expect(Product::query()->count())->toBe(0);
});

test('the same size is allowed in different sacks but not twice in one sack', function () {
    $user = User::factory()->create();

    $invalidResponse = $this->actingAs($user)
        ->from(route('products.create'))
        ->post(route('products.store'), [
            'name' => 'Grades repetidas',
            'has_stock_offer' => true,
            'stock_offer_type' => StockOfferType::NewGrade->value,
            'stock_volumes' => [[
                'total_quantity' => 2,
                'items' => [
                    ['size' => 'M', 'is_active' => true, 'quantity' => 1],
                    ['size' => 'M', 'is_active' => true, 'quantity' => 1],
                ],
            ]],
        ]);

    $invalidResponse
        ->assertSessionHasErrors([
            'stock_volumes.0.items.1.size' => 'Os tamanhos precisam ser diferentes dentro do saco.',
        ])
        ->assertRedirect(route('products.create'));

    expect(Product::query()->count())->toBe(0);

    $validResponse = $this->actingAs($user)->post(route('products.store'), [
        'name' => 'M em dois sacos',
        'has_stock_offer' => true,
        'stock_offer_type' => StockOfferType::NewGrade->value,
        'stock_volumes' => [
            [
                'total_quantity' => 1,
                'items' => [['size' => 'M', 'is_active' => true, 'quantity' => 1]],
            ],
            [
                'total_quantity' => 1,
                'items' => [['size' => 'M', 'is_active' => true, 'quantity' => 1]],
            ],
        ],
    ]);

    $validResponse->assertSessionHasNoErrors();
    expect(Product::query()->count())->toBe(1);
    expect(StockOfferVolume::query()->count())->toBe(2);
});

test('updating sacks preserves their IDs while reordering and removing them', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();
    $offer = $product->offers()->create([
        'type' => StockOfferType::NewGrade,
        'is_active' => true,
    ]);
    $firstVolume = $offer->stockVolumes()->create(['sort_order' => 0, 'total_quantity' => 5]);
    $secondVolume = $offer->stockVolumes()->create(['sort_order' => 1, 'total_quantity' => 7]);
    $firstItem = $firstVolume->items()->create([
        'size' => 'P',
        'sort_order' => 0,
        'is_active' => true,
        'quantity' => 5,
    ]);
    $secondItem = $secondVolume->items()->create([
        'size' => 'M',
        'sort_order' => 0,
        'is_active' => true,
        'quantity' => 7,
    ]);

    $reorderResponse = $this->actingAs($user)->put(route('products.update', $product), [
        'name' => $product->name,
        'is_active' => true,
        'has_stock_offer' => true,
        'stock_offer_type' => StockOfferType::NewGrade->value,
        'stock_volumes' => [
            [
                'id' => $secondVolume->id,
                'total_quantity' => 7,
                'items' => [[
                    'id' => $secondItem->id,
                    'size' => 'M',
                    'is_active' => true,
                    'quantity' => 7,
                ]],
            ],
            [
                'id' => $firstVolume->id,
                'total_quantity' => 5,
                'items' => [[
                    'id' => $firstItem->id,
                    'size' => 'P',
                    'is_active' => true,
                    'quantity' => 5,
                ]],
            ],
        ],
    ]);

    $reorderResponse->assertSessionHasNoErrors();
    expect($offer->fresh()->stockVolumes()->pluck('id')->all())
        ->toBe([$secondVolume->id, $firstVolume->id]);

    $removeResponse = $this->actingAs($user)->put(route('products.update', $product), [
        'name' => $product->name,
        'is_active' => true,
        'has_stock_offer' => true,
        'stock_offer_type' => StockOfferType::NewGrade->value,
        'stock_volumes' => [[
            'id' => $secondVolume->id,
            'total_quantity' => 7,
            'items' => [[
                'id' => $secondItem->id,
                'size' => 'M',
                'is_active' => true,
                'quantity' => 7,
            ]],
        ]],
    ]);

    $removeResponse->assertSessionHasNoErrors();
    expect(StockOfferVolume::query()->whereKey($firstVolume->id)->exists())->toBeFalse();
    expect(StockOfferVolume::query()->whereKey($secondVolume->id)->exists())->toBeTrue();
    expect($offer->fresh()->calculatedTotalQuantity())->toBe(7);
});

test('catalog availability uses physical sack totals', function () {
    $product = Product::factory()->create();
    $offer = $product->offers()->create([
        'type' => StockOfferType::Replenishment,
        'is_active' => true,
    ]);
    $offer->stockVolumes()->create([
        'sort_order' => 0,
        'total_quantity' => 0,
    ]);

    expect(
        StockOffer::query()
            ->availableForCatalog()
            ->whereKey($offer->id)
            ->exists(),
    )->toBeFalse();
});
