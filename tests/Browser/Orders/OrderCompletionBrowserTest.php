<?php

use App\Enums\StockOfferType;
use App\Models\CatalogSetting;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Vite;

beforeEach(function (): void {
    config(['inertia.ssr.enabled' => false]);
    Vite::useHotFile(storage_path('framework/testing-hot-file'));
});

test('requires opening the WhatsApp link before enabling order completion', function () {
    CatalogSetting::factory()->create(['whatsapp_number' => '5511988887777']);
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
        ->assertVisible('[data-testid="abrir-whatsapp-pedido"]')
        ->assertDisabled('[data-testid="finalizar-pedido"]')
        ->assertSee('Abra a conversa para liberar a finalização.');

    $page->script("document.querySelector('[data-testid=\"abrir-whatsapp-pedido\"]')?.click()");

    $page
        ->assertEnabled('[data-testid="finalizar-pedido"]')
        ->assertSee('Conversa aberta neste navegador.')
        ->assertNoJavaScriptErrors();
});
