<?php

use App\Enums\StockOfferType;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Vite;

beforeEach(function (): void {
    config(['inertia.ssr.enabled' => false]);
    Vite::useHotFile(storage_path('framework/testing-hot-file'));
});

it('keeps the dashboard as the first main navigation item', function () {
    $this->actingAs(User::factory()->create());

    visit(route('dashboard', [], false))
        ->assertScript("document.querySelector('[data-sidebar=\"content\"] [data-sidebar=\"menu-button\"] span')?.textContent === 'Painel'")
        ->assertNoJavaScriptErrors();
});

it('places the stock balance at the end of the main navigation', function () {
    $this->actingAs(User::factory()->create());

    visit(route('dashboard', [], false))
        ->assertScript("Array.from(document.querySelectorAll('[data-sidebar=\"content\"] [data-sidebar=\"menu-button\"] span')).map((item) => item.textContent?.trim()).join('|') === 'Painel|Produtos|Categorias|Pedidos|Movimentações|Balanço de estoque'")
        ->assertNoJavaScriptErrors();
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
        ->assertSee('peças disponíveis para distribuição')
        ->assertSee('Pedidos para preparar')
        ->assertSee('Não há pedidos pendentes neste momento.')
        ->assertSeeLink('Abrir pedidos', route('orders.index', [], false))
        ->assertNoJavaScriptErrors();

    $page
        ->press('Abrir catálogo')
        ->wait(1)
        ->assertRoute('products.index')
        ->assertSee($product->name)
        ->assertNoJavaScriptErrors();
});

it('opens the order area from the sidebar', function () {
    Order::factory()->create([
        'store_name' => 'Loja da timeline',
        'requester_name' => 'Ana',
    ]);
    $this->actingAs(User::factory()->create());

    visit(route('dashboard', [], false))
        ->click('[data-sidebar="menu-button"]:has-text("Pedidos")')
        ->wait(1)
        ->assertRoute('orders.index')
        ->assertSee('Acompanhe os pedidos e atualize cada solicitação.')
        ->assertSee('Loja da timeline')
        ->assertSee('Pedido criado')
        ->assertSee('Separação')
        ->assertSee('Conferência')
        ->assertSee('Finalizado')
        ->resize(390, 844)
        ->assertSee('Atual:')
        ->assertSee('Ver estados')
        ->assertMissing('[data-slot="collapsible-content"] li')
        ->press('Ver estados')
        ->assertSee('Ocultar estados')
        ->assertVisible('[data-testid="order-timeline-mobile"]')
        ->press('Ocultar estados')
        ->assertMissing('[data-slot="collapsible-content"] li')
        ->assertNoJavaScriptErrors();
});

it('closes the mobile sidebar after navigating from it', function () {
    $this->actingAs(User::factory()->create());

    $page = visit(route('dashboard', [], false))
        ->wait(1)
        ->resize(390, 844)
        ->wait(1);

    $page
        ->click('[data-slot="sidebar-trigger"]')
        ->assertVisible('[data-slot="sidebar"][data-mobile="true"]')
        ->click('[data-sidebar="menu-button"]:has-text("Produtos")')
        ->wait(1)
        ->assertRoute('products.index')
        ->assertMissing('[data-slot="sidebar"][data-mobile="true"]')
        ->assertNoJavaScriptErrors();
});
