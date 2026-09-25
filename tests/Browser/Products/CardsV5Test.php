<?php

use App\Enums\StockOfferType;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Vite;

beforeEach(function (): void {
    config(['inertia.ssr.enabled' => false]);
    Vite::useHotFile(storage_path('framework/testing-hot-file'));
});

it('shows stock first and keeps secondary details behind an explicit action', function () {
    $product = Product::factory()->create([
        'name' => 'Calça V5 para estoque',
        'notes' => 'Separar por tonalidade',
    ]);
    $offer = $product->offers()->create(['type' => StockOfferType::Replenishment]);
    $volume = $offer->stockVolumes()->create(['sort_order' => 0, 'total_quantity' => 4]);
    $volume->items()->create([
        'size' => '38',
        'sort_order' => 0,
        'is_active' => true,
        'quantity' => 4,
    ]);
    $this->actingAs(User::factory()->create());

    visit(route('products.card-preview-v5', [], false))
        ->resize(390, 844)
        ->assertPresent('[data-testid="product-card-v5"]')
        ->assertSee($product->name)
        ->assertSee('4 peças')
        ->assertSee('1 saco livre')
        ->assertSee('38')
        ->assertDontSee('Separar por tonalidade')
        ->click('button:has-text("Detalhes")')
        ->assertSee('Separar por tonalidade')
        ->assertSee('Disponível · 4 peças')
        ->assertNoJavaScriptErrors();
});
