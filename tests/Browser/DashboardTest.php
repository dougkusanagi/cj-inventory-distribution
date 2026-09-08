<?php

use App\Enums\StockOfferType;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Vite;

beforeEach(function (): void {
    config(['inertia.ssr.enabled' => false]);
    Vite::useHotFile(storage_path('framework/testing-hot-file'));
});

it('shows the stock summary and opens the product catalog', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create(['name' => 'Produto do painel E2E']);
    $offer = $product->offers()->create([
        'type' => StockOfferType::NewGrade,
        'is_active' => true,
    ]);
    $volume = $offer->stockVolumes()->create([
        'sort_order' => 0,
        'total_quantity' => 8,
    ]);
    $volume->items()->create([
        'size' => 'M',
        'sort_order' => 0,
        'is_active' => true,
        'quantity' => 8,
    ]);

    $this->actingAs($user);

    $page = visit(route('dashboard', [], false))
        ->wait(1)
        ->assertRoute('dashboard')
        ->assertSee('O que está acontecendo no estoque?')
        ->assertSee('01')
        ->assertSee('8 peças disponíveis para distribuição.')
        ->assertSee('unidades disponíveis para distribuição')
        ->assertNoJavaScriptErrors();

    $page
        ->press('Abrir catálogo')
        ->wait(1)
        ->assertRoute('products.index')
        ->assertSee($product->name)
        ->assertNoJavaScriptErrors();
});
