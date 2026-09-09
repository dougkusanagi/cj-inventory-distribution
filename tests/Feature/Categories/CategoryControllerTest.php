<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected when visiting categories', function () {
    $this->get(route('categories.index'))->assertRedirect(route('login'));
});

test('authenticated users can list and search categories', function () {
    Category::factory()->create(['name' => 'Calça', 'slug' => 'calca']);
    Category::factory()->create(['name' => 'Cropped', 'slug' => 'cropped']);

    $this->actingAs(User::factory()->create())
        ->get(route('categories.index', ['search' => 'Cal']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('categories/index')
            ->has('categories.data', 1)
            ->where('categories.data.0.name', 'Calça'));
});

test('authenticated users can create and update a normalized category', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('categories.store'), [
        'name' => '  Calça   Jeans  ',
        'is_active' => true,
    ])->assertRedirect(route('categories.index'));

    $category = Category::query()->sole();
    expect($category->name)->toBe('Calça Jeans')
        ->and($category->slug)->toBe('calca-jeans');

    $this->actingAs($user)->put(route('categories.update', $category), [
        'name' => 'Calças',
        'is_active' => false,
    ])->assertRedirect(route('categories.index'));

    expect($category->refresh()->name)->toBe('Calças')
        ->and($category->slug)->toBe('calcas')
        ->and($category->is_active)->toBeFalse();
});

test('category names are unique after normalization', function () {
    Category::factory()->create(['name' => 'Calça Jeans', 'slug' => 'calca-jeans']);

    $this->actingAs(User::factory()->create())->post(route('categories.store'), [
        'name' => '  CALÇA jeans ',
        'is_active' => true,
    ])->assertInvalid(['slug' => 'Já existe uma categoria com esse nome.']);
});

test('categories without products can be deleted', function () {
    $category = Category::factory()->create();

    $this->actingAs(User::factory()->create())
        ->delete(route('categories.destroy', $category))
        ->assertRedirect(route('categories.index'));

    $this->assertModelMissing($category);
});

test('categories in use cannot be deleted', function () {
    $category = Category::factory()->create();
    Product::factory()->inCategory($category)->create();

    $this->actingAs(User::factory()->create())
        ->delete(route('categories.destroy', $category))
        ->assertInvalid(['category' => 'Categoria em uso. Desative ou reclassifique os produtos.']);

    $this->assertModelExists($category);
});
