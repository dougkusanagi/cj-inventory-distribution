<?php

use App\Models\Product;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('marketing is sent from the dashboard to the photo screen', function () {
    $this->actingAs(User::factory()->marketing()->create())
        ->get(route('dashboard'))
        ->assertRedirect(route('product-photos.index'));
});

test('marketing cannot reach operational screens or actions', function (string $method, string $routeName) {
    $product = Product::factory()->create();
    $parameters = str_contains($routeName, 'products.') && $routeName !== 'products.index' && $routeName !== 'products.create'
        ? ['product' => $product]
        : [];

    $this->actingAs(User::factory()->marketing()->create())
        ->{$method}(route($routeName, $parameters))
        ->assertForbidden();
})->with([
    'products' => ['get', 'products.index'],
    'product creation' => ['get', 'products.create'],
    'product editing' => ['get', 'products.edit'],
    'product update' => ['put', 'products.update'],
    'product deletion' => ['delete', 'products.destroy'],
    'orders' => ['get', 'orders.index'],
    'stock history' => ['get', 'stock-movements.index'],
    'stock entry' => ['get', 'stock-entries.create'],
    'inventory counts' => ['get', 'inventory.index'],
    'categories' => ['get', 'categories.index'],
    'catalog settings' => ['get', 'catalog-settings.edit'],
]);

test('marketing keeps access to its own account settings', function () {
    $this->actingAs(User::factory()->marketing()->create())
        ->get(route('appearance.edit'))
        ->assertOk();
});

test('stock and admin users operate the panel', function (string $state) {
    $this->actingAs(User::factory()->{$state}()->create())
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('auth.can.manageOperations', true)
            ->where('auth.can.managePhotos', $state === 'admin'),
        );
})->with(['stock', 'admin']);

test('admin can also use the photo screen', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('product-photos.index'))
        ->assertOk();
});

test('users without a role cannot enter the panel', function () {
    $user = User::factory()->nonStaff()->create();

    $this->actingAs($user)->get(route('dashboard'))->assertForbidden();
    $this->actingAs($user)->get(route('product-photos.index'))->assertForbidden();
});
