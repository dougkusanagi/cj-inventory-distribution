<?php

use App\Enums\StockOfferType;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockOffer;
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
    $product->variants()->createMany([
        ['size' => '34', 'sort_order' => 0],
        ['size' => '36', 'sort_order' => 1],
    ]);

    $this->actingAs($user)
        ->get(route('products.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('products/index')
            ->where('products.data.0.id', $product->id)
            ->where('products.data.0.variants.0.size', '34')
            ->where('stats.total', 1)
            ->where('stats.withSizes', 1),
        );
});

test('authenticated users can open the product forms', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();
    $variant = $product->variants()->create(['size' => 'M', 'sort_order' => 0]);
    $offer = $product->offers()->create([
        'type' => StockOfferType::NewGrade,
        'total_quantity' => 8,
    ]);
    $offer->items()->create([
        'product_variant_id' => $variant->id,
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
            ->where('product.variants.0.is_active', true)
            ->where('product.variants.0.quantity', 8),
        );
});

test('authenticated users can create a product with optional model, ordered sizes and stock', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('products.store'), [
        'name' => '  Jaqueta Jeans Oversized  ',
        'model' => '  ',
        'notes' => 'Lavagem média',
        'total_quantity' => 15,
        'variants' => [
            ['size' => 'P', 'quantity' => 5, 'is_active' => true],
            ['size' => 'M', 'quantity' => 5, 'is_active' => true],
            ['size' => 'G', 'quantity' => 5, 'is_active' => true],
        ],
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $product = Product::query()->with(['variants', 'latestOffer.items'])->sole();

    $this->assertModelExists($product);
    expect($product->code)->toBe('CJ-000001');
    expect($product->name)->toBe('Jaqueta Jeans Oversized');
    expect($product->model)->toBeNull();
    expect($product->variants()->pluck('size')->all())->toBe(['P', 'M', 'G']);
    expect($product->latestOffer)->not->toBeNull();
    expect($product->latestOffer->total_quantity)->toBe(15);
    expect($product->latestOffer->type)->toBe(StockOfferType::NewGrade);
    expect($product->latestOffer->items->pluck('is_active')->all())->toBe([true, true, true]);
    expect($product->latestOffer->items->pluck('quantity')->all())->toBe([5, 5, 5]);
});

test('authenticated users can create a product without any stock (stock is optional)', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('products.store'), [
        'name' => 'Calça Mom Básica',
        'variants' => [
            ['size' => '36', 'quantity' => null, 'is_active' => false],
            ['size' => '38', 'quantity' => null, 'is_active' => false],
        ],
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $product = Product::query()->sole();
    expect($product->offers()->count())->toBe(0);
});

test('authenticated users can save which sizes are present without quantities', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('products.store'), [
        'name' => 'Blusa de malha',
        'variants' => [
            ['size' => 'P', 'is_active' => true],
            ['size' => 'M', 'is_active' => false],
            ['size' => 'G', 'is_active' => true],
        ],
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $product = Product::query()->with('latestOffer.items')->sole();

    expect($product->latestOffer)->not->toBeNull();
    expect($product->latestOffer->total_quantity)->toBe(0);
    expect($product->latestOffer->items->pluck('is_active')->all())->toBe([true, false, true]);
    expect($product->latestOffer->items->pluck('quantity')->all())->toBe([null, null, null]);
});

test('product creation returns validation errors and does not persist invalid data', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->from(route('products.create'))->post(route('products.store'), [
        'name' => '   ',
        'total_quantity' => -5,
        'variants' => [
            ['size' => 'M', 'quantity' => -2],
            ['size' => 'M', 'quantity' => 3],
        ],
    ]);

    $response
        ->assertSessionHasErrors([
            'name' => 'Informe o nome do produto.',
            'total_quantity' => 'O estoque total não pode ser negativo.',
            'variants.0.quantity' => 'A quantidade por tamanho não pode ser negativa.',
            'variants.1.size' => 'Os tamanhos precisam ser diferentes.',
        ])
        ->assertRedirect(route('products.create'));

    expect(Product::query()->count())->toBe(0);
});

test('product creation rejects non-image uploads', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->from(route('products.create'))->post(route('products.store'), [
        'name' => 'Produto com arquivo inválido',
        'image' => UploadedFile::fake()->create('manual.txt', 10, 'text/plain'),
    ]);

    $response
        ->assertSessionHasErrors('image')
        ->assertRedirect(route('products.create'));

    expect(Product::query()->count())->toBe(0);
});

test('authenticated users can update product details, sizes and stock without changing its code', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create([
        'name' => 'Nome anterior',
        'model' => '2451',
    ]);
    $product->variants()->create(['size' => 'U', 'sort_order' => 0]);
    $originalCode = $product->code;

    $response = $this->actingAs($user)->put(route('products.update', $product), [
        'name' => 'Short Mom',
        'model' => '3002',
        'notes' => 'Nova observação',
        'total_quantity' => 20,
        'variants' => [
            ['size' => '36', 'quantity' => 10, 'is_active' => true],
            ['size' => '38', 'quantity' => null, 'is_active' => false],
        ],
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $product->refresh();
    expect($product->code)->toBe($originalCode);
    expect($product->name)->toBe('Short Mom');
    expect($product->model)->toBe('3002');
    expect($product->variants()->pluck('size')->all())->toBe(['36', '38']);
    expect($product->latestOffer->total_quantity)->toBe(20);
    expect($product->latestOffer->items->pluck('is_active')->all())->toBe([true, false]);
    expect($product->latestOffer->items->pluck('quantity')->all())->toBe([10, null]);
});

test('updating a product without stock deactivates its previous offer', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();
    $variant = $product->variants()->create(['size' => 'M', 'sort_order' => 0]);
    $offer = $product->offers()->create([
        'type' => StockOfferType::NewGrade,
        'total_quantity' => 10,
    ]);
    $offer->items()->create([
        'product_variant_id' => $variant->id,
        'quantity' => 10,
        'is_active' => true,
    ]);

    $response = $this->actingAs($user)->put(route('products.update', $product), [
        'name' => $product->name,
        'variants' => [
            ['size' => 'M', 'quantity' => null, 'is_active' => false],
        ],
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $offer->refresh();
    expect($offer->is_active)->toBeFalse();
    expect($offer->total_quantity)->toBe(0);
    expect($offer->items()->count())->toBe(0);
});

test('product images can be replaced and removed', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $oldImagePath = 'products/old.jpg';
    Storage::disk('public')->put($oldImagePath, 'old image');
    $product = Product::factory()->create(['image_path' => $oldImagePath]);

    $replaceResponse = $this->actingAs($user)->post(route('products.update', $product), [
        '_method' => 'PUT',
        'name' => $product->name,
        'image' => UploadedFile::fake()->image('new.jpg'),
    ]);

    $replaceResponse
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $product->refresh();
    expect($product->image_path)->not->toBe($oldImagePath);
    Storage::disk('public')->assertMissing($oldImagePath);
    Storage::disk('public')->assertExists($product->image_path);
    $replacedImagePath = $product->image_path;

    $removeResponse = $this->actingAs($user)->post(route('products.update', $product), [
        '_method' => 'PUT',
        'name' => $product->name,
        'remove_image' => '1',
    ]);

    $removeResponse
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    expect($product->refresh()->image_path)->toBeNull();
    Storage::disk('public')->assertMissing($replacedImagePath);
});

test('authenticated users can delete a product with its variants, stock offer and image', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $imagePath = 'products/delete-me.jpg';
    Storage::disk('public')->put($imagePath, 'image');
    $product = Product::factory()->create(['image_path' => $imagePath]);
    $variant = $product->variants()->create(['size' => 'M', 'sort_order' => 0]);
    $offer = $product->offers()->create(['type' => StockOfferType::NewGrade, 'total_quantity' => 10]);
    $offer->items()->create(['product_variant_id' => $variant->id, 'quantity' => 10]);

    $response = $this->actingAs($user)->delete(route('products.destroy', $product));

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $this->assertModelMissing($product);
    expect(ProductVariant::query()->where('product_id', $product->id)->exists())->toBeFalse();
    expect(StockOffer::query()->where('product_id', $product->id)->exists())->toBeFalse();
    Storage::disk('public')->assertMissing($imagePath);
});
