<?php

use App\Models\Product;
use App\Models\ProductVariant;
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
            ->where('product.id', $product->id),
        );
});

test('authenticated users can create a product with optional model and ordered sizes', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('products.store'), [
        'name' => '  Jaqueta Jeans Oversized  ',
        'model' => '  ',
        'notes' => 'Lavagem média',
        'variants' => [
            ['size' => 'P'],
            ['size' => 'M'],
            ['size' => 'G'],
        ],
    ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $product = Product::query()->sole();

    $this->assertModelExists($product);
    expect($product->code)->toBe('CJ-000001');
    expect($product->name)->toBe('Jaqueta Jeans Oversized');
    expect($product->model)->toBeNull();
    expect($product->variants()->pluck('size')->all())->toBe(['P', 'M', 'G']);
});

test('product creation returns validation errors and does not persist invalid data', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->from(route('products.create'))->post(route('products.store'), [
        'name' => '   ',
        'variants' => [
            ['size' => 'M'],
            ['size' => 'M'],
        ],
    ]);

    $response
        ->assertSessionHasErrors([
            'name' => 'Informe o nome do produto.',
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

test('authenticated users can update product details and sizes without changing its code', function () {
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
        'variants' => [
            ['size' => '36'],
            ['size' => '38'],
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

test('authenticated users can delete a product with its variants and image', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $imagePath = 'products/delete-me.jpg';
    Storage::disk('public')->put($imagePath, 'image');
    $product = Product::factory()->create(['image_path' => $imagePath]);
    $product->variants()->create(['size' => 'M', 'sort_order' => 0]);

    $response = $this->actingAs($user)->delete(route('products.destroy', $product));

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $this->assertModelMissing($product);
    expect(ProductVariant::query()->where('product_id', $product->id)->exists())->toBeFalse();
    Storage::disk('public')->assertMissing($imagePath);
});
