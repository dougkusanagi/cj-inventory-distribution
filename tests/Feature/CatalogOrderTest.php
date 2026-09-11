<?php

use App\Enums\OrderStatus;
use App\Models\CatalogSetting;
use App\Models\Order;
use App\Models\Product;
use App\Models\StockOffer;
use App\Models\StockOfferVolume;

function catalogOrderVolume(): StockOfferVolume
{
    $product = Product::factory()->create(['name' => 'Calça Reta']);
    $offer = StockOffer::factory()->replenishment()->for($product)->create();
    $volume = StockOfferVolume::factory()->for($offer)->withTotal(12)->create();
    $volume->items()->create([
        'size' => 'M',
        'is_active' => true,
        'quantity' => 12,
    ]);

    return $volume;
}

it('registers and reserves a catalog order before opening WhatsApp', function () {
    $volume = catalogOrderVolume();
    CatalogSetting::factory()->create(['whatsapp_number' => '5511988887777']);

    $response = $this->from(route('catalog'))->post(route('catalog-orders.store'), [
        'store_name' => 'Loja Centro',
        'requester_name' => 'Ana',
        'whatsapp' => '5511999999999',
        'notes' => 'Entregar pela manhã.',
        'volume_ids' => [$volume->id],
        'idempotency_key' => 'catalog-order-001',
    ]);

    $order = Order::query()->with('items')->sole();
    $response->assertRedirect(route('catalog'))
        ->assertInertiaFlash('checkout.orderCode', $order->code)
        ->assertInertiaFlash('checkout.whatsappUrl');
    $location = urldecode((string) data_get(session('inertia.flash_data'), 'checkout.whatsappUrl'));

    expect($location)
        ->toStartWith('https://wa.me/5511988887777?text=')
        ->toContain("Pedido {$order->code}")
        ->toContain('Calça Reta')
        ->toContain('Total: 1 saco · 12 peças')
        ->and($order->status)->toBe(OrderStatus::Pending)
        ->and($volume->refresh()->current_order_id)->toBe($order->id);
});

it('does not register a catalog order before WhatsApp is configured', function () {
    $volume = catalogOrderVolume();

    $this->post(route('catalog-orders.store'), [
        'store_name' => 'Loja Centro',
        'requester_name' => 'Ana',
        'volume_ids' => [$volume->id],
        'idempotency_key' => 'catalog-order-002',
    ])->assertInvalid([
        'order' => 'Os pedidos pelo catálogo estão temporariamente indisponíveis. Fale com a equipe da Crônicas Jeans.',
    ]);

    $this->assertDatabaseEmpty('orders');
    expect($volume->refresh()->current_order_id)->toBeNull();
});
