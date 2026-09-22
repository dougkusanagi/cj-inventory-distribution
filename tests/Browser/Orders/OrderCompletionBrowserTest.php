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
        ->assertSee('Informações do pedido')
        ->assertSee('Número do pedido')
        ->assertSee('WhatsApp')
        ->assertSee('Observações')
        ->assertSee('12 pçs')
        ->assertSee('Separação e conferência')
        ->assertSee('Separe cada saco, confira o conteúdo e registre qualquer divergência antes de finalizar.')
        ->assertSee('Separe e confira todos os sacos e resolva as divergências antes de finalizar.')
        ->assertAttribute('#order-tab-details', 'aria-selected', 'true')
        ->assertAttribute('#order-tab-history', 'aria-selected', 'false')
        ->click('#order-tab-history')
        ->assertAttribute('#order-tab-history', 'aria-selected', 'true')
        ->assertVisible('[data-testid="historico-pedido"]')
        ->click('#order-tab-details')
        ->assertAttribute('#order-tab-details', 'aria-selected', 'true')
        ->click('[data-testid="menu-acoes-pedido"]')
        ->assertVisible(
            '[data-slot="dropdown-menu-content"][data-state="open"]',
        )
        ->assertSee('Ações do pedido')
        ->assertVisible('[data-testid="editar-pedido"]')
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
        ->assertDontSee('Separe e confira todos os sacos e resolva as divergências antes de finalizar.');

    $page->script("document.querySelector('[data-testid=finalizar-pedido]')?.click()");

    $page
        ->wait(0.5)
        ->assertVisible('[role="dialog"]')
        ->assertSee('Finalizar pedido?')
        ->assertSee('serão marcados como consumidos e sairão do estoque')
        ->click('Confirmar finalização')
        ->assertSee('Finalizado')
        ->assertAttribute('#order-tab-details', 'aria-selected', 'true')
        ->assertNoJavaScriptErrors();

    expect($order->refresh()->status->value)->toBe('completed')
        ->and($volume->refresh()->current_order_id)->toBeNull()
        ->and($volume->consumed_at)->not->toBeNull();
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
        ->assertSee('Sacos reservados')
        ->assertSee($product->name)
        ->assertSee($volume->refresh()->code)
        ->assertVisible('[data-testid="voltar-pedido"]')
        ->assertSee('Voltar ao pedido')
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

test('creates, reads, updates, and cancels an order through the interface', function () {
    $product = Product::factory()->create(['name' => 'Produto pedido CRUD E2E']);
    $offer = $product->offers()->create(['type' => StockOfferType::Replenishment]);
    $volume = $offer->stockVolumes()->create(['total_quantity' => 8]);
    $volume->items()->create(['size' => 'M', 'is_active' => true, 'quantity' => 8]);
    $volume->refresh();
    $this->actingAs(User::factory()->create());

    $page = visit(route('orders.create', [], false))
        ->assertRoute('orders.create')
        ->type('#store-name', 'Loja CRUD E2E')
        ->type('#requester-name', 'Ana E2E')
        ->click('[data-slot="checkbox"]')
        ->assertAttribute('[data-slot="checkbox"]', 'data-state', 'checked')
        ->press('Registrar pedido')
        ->assertSee('Produto pedido CRUD E2E');

    $order = Order::query()->sole();

    $page
        ->assertRoute('orders.show', [$order->id])
        ->assertSee('Loja CRUD E2E')
        ->assertSee('Ana E2E')
        ->assertSee('Produto pedido CRUD E2E')
        ->assertNoJavaScriptErrors();

    expect($volume->refresh()->current_order_id)->toBe($order->id);

    $page
        ->click('[data-testid="menu-acoes-pedido"]')
        ->click('[data-testid="editar-pedido"]')
        ->assertRoute('orders.edit', [$order->id])
        ->clear('#store-name')
        ->fill('#store-name', 'Loja Atualizada E2E')
        ->fill('#order-notes', 'Observação atualizada pelo E2E.')
        ->press('Salvar alterações')
        ->assertRoute('orders.show', [$order->id])
        ->assertSee('Loja Atualizada E2E')
        ->click('#order-tab-details')
        ->assertSee('Observação atualizada pelo E2E.')
        ->assertNoJavaScriptErrors();

    expect($order->refresh()->store_name)->toBe('Loja Atualizada E2E')
        ->and($order->notes)->toBe('Observação atualizada pelo E2E.');

    $page
        ->click('[data-testid="menu-acoes-pedido"]')
        ->click('[data-testid="cancelar-pedido"]')
        ->fill('#cancel-reason', 'Pedido cancelado pelo teste E2E.')
        ->press('Confirmar cancelamento')
        ->assertRoute('orders.show', [$order->id])
        ->assertSee('Cancelado')
        ->assertSee('Pedido cancelado pelo teste E2E.')
        ->assertNoJavaScriptErrors();

    expect($order->refresh()->status->value)->toBe('canceled')
        ->and($volume->refresh()->current_order_id)->toBeNull();
});
