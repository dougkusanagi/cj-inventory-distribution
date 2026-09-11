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

test('enables order completion after all sacks are checked without WhatsApp', function () {
    $product = Product::factory()->create();
    $offer = $product->offers()->create([
        'type' => StockOfferType::Replenishment,
        'is_active' => true,
    ]);
    $volume = $offer->stockVolumes()->create(['total_quantity' => 12]);
    $volume->items()->create(['size' => 'M', 'is_active' => true, 'quantity' => 12]);
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('orders.store'), [
        'store_name' => 'Loja Centro',
        'requester_name' => 'Ana',
        'volume_ids' => [$volume->id],
    ]);
    $order = Order::query()->sole();

    $page = visit(route('orders.show', $order, false))
        ->assertVisible('[data-testid="menu-acoes-pedido"]')
        ->assertVisible('[data-testid="finalizar-pedido"]')
        ->assertDisabled('[data-testid="finalizar-pedido"]')
        ->assertMissing('[data-testid="abrir-whatsapp-pedido"]')
        ->assertVisible('[aria-label="Tamanho M, 12 peças"]')
        ->assertSee('12 pçs')
        ->assertScript("(() => { const actions = document.querySelector('[data-testid=acoes-finalizacao]'); const history = document.querySelector('[data-testid=historico-pedido]'); return actions !== null && history !== null && actions.getBoundingClientRect().top < history.getBoundingClientRect().top; })()")
        ->assertSee('Separe e confira todos os sacos e resolva as divergências antes de finalizar.')
        ->click('[data-testid="menu-acoes-pedido"]')
        ->assertVisible(
            '[data-slot="dropdown-menu-content"][data-state="open"]',
        )
        ->assertSee('Ações do pedido')
        ->assertVisible('[data-testid="editar-pedido"]')
        ->assertVisible('[data-testid="finalizar-pedido-menu"]')
        ->assertSee('Editar pedido')
        ->assertSee('Cancelar pedido')
        ->click('[data-testid="cancelar-pedido"]')
        ->assertVisible('[role="dialog"]')
        ->assertSee("Cancelar {$order->code}?")
        ->click('Voltar')
        ->assertMissing('[role="dialog"]');

    $item = $order->items()->firstOrFail();
    $page
        ->click("[data-testid=separar-saco-{$item->id}]")
        ->click("[data-testid=conferir-saco-{$item->id}]")
        ->assertEnabled('[data-testid="finalizar-pedido"]')
        ->assertDontSee('Separe e confira todos os sacos e resolva as divergências antes de finalizar.')
        ->assertNoJavaScriptErrors();
});

test('provides return and cancellation actions while editing an order', function () {
    $product = Product::factory()->create();
    $offer = $product->offers()->create([
        'type' => StockOfferType::Replenishment,
        'is_active' => true,
    ]);
    $volume = $offer->stockVolumes()->create(['total_quantity' => 12]);
    $volume->items()->create(['size' => 'M', 'is_active' => true, 'quantity' => 12]);
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('orders.store'), [
        'store_name' => 'Loja para editar',
        'requester_name' => 'Ana',
        'volume_ids' => [$volume->id],
    ]);
    $order = Order::query()->sole();

    visit(route('orders.edit', $order, false))
        ->assertRoute('orders.edit', [$order->id])
        ->assertSee('Editar pedido')
        ->assertVisible('[data-testid="voltar-pedido"]')
        ->assertVisible('[data-testid="cancelar-edicao"]')
        ->assertVisible('nav[aria-label="breadcrumb"] a[href$="/painel/pedidos/'.$order->id.'"]')
        ->click('nav[aria-label="breadcrumb"] a[href$="/painel/pedidos/'.$order->id.'"]')
        ->wait(1)
        ->assertRoute('orders.show', [$order->id])
        ->assertSee('Loja para editar')
        ->assertNoJavaScriptErrors();

    visit(route('orders.edit', $order, false))
        ->assertVisible('[data-testid="cancelar-edicao"]')
        ->click('[data-testid="cancelar-edicao"]')
        ->wait(1)
        ->assertRoute('orders.show', [$order->id])
        ->assertSee('Loja para editar')
        ->assertNoJavaScriptErrors();
});
