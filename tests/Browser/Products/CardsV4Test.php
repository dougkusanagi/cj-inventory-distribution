<?php

use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Vite;

beforeEach(function (): void {
    config(['inertia.ssr.enabled' => false]);
    Vite::useHotFile(storage_path('framework/testing-hot-file'));
});

it('shows the v4 card and lets staff search on mobile', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create(['name' => 'Calça da V4']);
    Product::factory()->create(['name' => 'Bermuda da V4']);

    $this->actingAs($user);

    visit(route('products.card-preview-v4', [], false))
        ->resize(390, 844)
        ->assertPresent('[data-testid="product-card"]')
        ->assertSee($product->name)
        ->assertSee('Editar produto')
        ->fill('#mobile-product-search', 'não existe')
        ->click('button[aria-label="Buscar produtos"]')
        ->assertSee('Nenhum produto encontrado')
        ->click('button:has-text("Limpar filtros"):visible')
        ->assertSee($product->name)
        ->assertNoJavaScriptErrors();
});
