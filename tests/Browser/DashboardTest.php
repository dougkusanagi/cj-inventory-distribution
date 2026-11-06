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
        ->resize(1366, 900)
        ->assertScript("document.querySelector('header nav a')?.textContent?.trim() === 'Painel'")
        ->assertNoJavaScriptErrors();
});

it('marks only the current top-level page as active', function () {
    $this->actingAs(User::factory()->create());

    visit(route('dashboard', [], false))
        ->resize(1366, 900)
        ->assertScript("Array.from(document.querySelectorAll('header nav [aria-current=page]')).map((item) => item.textContent?.trim()).join('|') === 'Painel'")
        ->click('header nav a[href="/painel/produtos"]')
        ->assertRoute('products.index')
        ->assertScript("Array.from(document.querySelectorAll('header nav [aria-current=page]')).map((item) => item.textContent?.trim()).join('|') === 'Produtos'")
        ->assertNoJavaScriptErrors();
});

it('groups stock operations under the stock navigation', function () {
    $this->actingAs(User::factory()->create());

    visit(route('dashboard', [], false))
        ->resize(1366, 900)
        ->assertScript("Array.from(document.querySelectorAll('header nav a, header nav button')).map((item) => item.textContent?.trim()).join('|') === 'Painel|Produtos|Categorias|Tipos de lavagem|Pedidos|Estoque|Produção|Fotos dos produtos|Usuários'")
        ->assertPresent('header a[aria-label="Novidades"]')
        ->click('header nav button:has-text("Estoque")')
        ->assertScript("Array.from(document.querySelectorAll('[data-slot=\"dropdown-menu-item\"]')).map((item) => item.textContent?.trim()).join('|') === 'Balanço de estoque|Histórico de estoque'")
        ->click('[data-slot="dropdown-menu-item"]:has-text("Balanço de estoque")')
        ->assertRoute('inventory.index')
        ->assertMissing('[data-slot="dropdown-menu-item"]')
        ->assertNoJavaScriptErrors();
});

it('keeps the main navigation on one line on common desktop widths', function (int $width) {
    $this->actingAs(User::factory()->create());

    visit(route('dashboard', [], false))
        ->resize($width, 900)
        ->assertScript("(() => { const nav = document.querySelector('header nav'); return getComputedStyle(nav).display !== 'none' && nav.scrollWidth <= nav.clientWidth + 1 && document.documentElement.scrollWidth <= window.innerWidth; })()")
        ->assertNoJavaScriptErrors();
})->with([1280, 1366, 1920]);

it('shows the stock summary and opens the product catalog', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create(['name' => 'Produto do painel E2E']);
    $product->update(['stock_offer_type' => StockOfferType::NewGrade]);
    $volume = $product->stockVolumes()->create([
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
        ->assertRoute('products.index')
        ->assertSee($product->name)
        ->assertNoJavaScriptErrors();
});

it('opens the order area from the main navigation', function () {
    Order::factory()->create([
        'store_name' => 'Loja da timeline',
        'requester_name' => 'Ana',
    ]);
    $this->actingAs(User::factory()->create());

    visit(route('dashboard', [], false))
        ->resize(1366, 900)
        ->click('header nav a:has-text("Pedidos")')
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

it('closes the mobile menu after navigating from it', function () {
    $this->actingAs(User::factory()->create());

    visit(route('dashboard', [], false))
        ->resize(390, 844)
        ->assertMissing('header nav')
        ->click('@mobile-menu-button')
        ->assertVisible('[data-slot="drawer-content"]')
        ->assertSee('Balanço de estoque')
        ->assertSee('Novidades')
        ->click('[data-slot="drawer-content"] a[href="/painel/produtos"]')
        ->assertRoute('products.index')
        ->assertMissing('[data-slot="drawer-content"]')
        ->assertNoJavaScriptErrors();
});
