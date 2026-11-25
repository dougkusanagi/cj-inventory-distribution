<?php

use App\Enums\OrderStatus;
use App\Enums\StockOfferType;
use App\Models\CatalogSetting;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\StockOfferVolume;
use App\Models\Store;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

it('restricts store information and management to the operations team', function (): void {
    $store = Store::factory()->create();

    $this->get(route('stores.index'))->assertRedirect(route('login'));

    $this->actingAs(User::factory()->marketing()->create());
    $this->get(route('stores.index'))->assertForbidden();
    $this->put(route('stores.update', $store), ['name' => 'Outro nome', 'is_active' => true])
        ->assertForbidden();

    expect($store->fresh()->name)->toBe($store->name);
});

it('validates, audits and deactivates a registered store', function (): void {
    $this->actingAs(User::factory()->stock()->create());

    $this->post(route('stores.store'), [])->assertInvalid(['name', 'is_active']);

    $this->post(route('stores.store'), ['name' => '  Loja   São Paulo  ', 'is_active' => true])
        ->assertRedirect(route('stores.index'));
    $store = Store::query()->sole();
    expect($store->name)->toBe('Loja São Paulo');

    $this->post(route('stores.store'), ['name' => 'loja são paulo', 'is_active' => true])
        ->assertInvalid(['name' => 'Já existe uma loja com esse nome.']);

    $this->put(route('stores.update', $store), ['name' => 'LOJA São Paulo', 'is_active' => false])
        ->assertRedirect(route('stores.index'));
    expect($store->fresh()->is_active)->toBeFalse();
    $this->assertDatabaseHas('audit_logs', ['auditable_type' => $store->getMorphClass(), 'auditable_id' => $store->id]);
});

it('links a catalog order to the active store and preserves the submitted name and original replay', function (): void {
    $store = Store::factory()->create(['name' => 'Loja São Paulo']);
    $product = Product::factory()->create(['stock_offer_type' => StockOfferType::Replenishment]);
    $volume = StockOfferVolume::factory()->for($product)->withTotal(4)->create();
    CatalogSetting::factory()->create();

    $payload = [
        'store_name' => 'loja  são paulo',
        'requester_name' => 'Ana',
        'volume_ids' => [$volume->id],
        'idempotency_key' => 'loja-sao-paulo-pedido',
    ];

    $this->post(route('catalog-orders.store'), $payload)->assertSessionHasNoErrors();
    $order = Order::query()->sole();
    expect($order->store_id)->toBe($store->id)
        ->and($order->store_name)->toBe('loja são paulo')
        ->and($volume->fresh()->current_order_id)->toBe($order->id);

    $store->update(['name' => 'Loja Capital', 'is_active' => false]);
    $this->post(route('catalog-orders.store'), $payload)
        ->assertSessionHasNoErrors()
        ->assertInertiaFlash('checkout.orderCode', $order->code);
    $this->assertDatabaseCount('orders', 1);

    $this->actingAs(User::factory()->stock()->create())
        ->put(route('orders.update', $order), ['store_name' => 'Loja São Paulo', 'requester_name' => 'Maria'])
        ->assertSessionHasNoErrors();
    expect($order->fresh()->store_id)->toBe($store->id);
});

it('leaves unrecognized stores unlinked and lets the team correct a pending order', function (): void {
    $inactive = Store::factory()->create(['name' => 'Loja Antiga', 'is_active' => false]);
    $active = Store::factory()->create(['name' => 'Loja Nova']);
    $product = Product::factory()->create(['stock_offer_type' => StockOfferType::Replenishment]);
    $volume = StockOfferVolume::factory()->for($product)->withTotal(3)->create();

    $this->actingAs(User::factory()->stock()->create())
        ->post(route('orders.store'), [
            'store_name' => $inactive->name,
            'requester_name' => 'Ana',
            'volume_ids' => [$volume->id],
        ])->assertSessionHasNoErrors();
    $order = Order::query()->sole();
    expect($order->store_id)->toBeNull()
        ->and($order->store_name)->toBe($inactive->name);

    $this->put(route('orders.update', $order), [
        'store_name' => $active->name,
        'requester_name' => 'Ana',
    ])->assertRedirect(route('orders.show', $order));
    expect($order->fresh()->store_id)->toBe($active->id);
});

it('reports pieces in completed orders by store and counts unlinked pieces separately', function (): void {
    $store = Store::factory()->create(['name' => 'Loja Centro', 'is_active' => false]);
    Store::factory()->create(['name' => 'Loja Leste']);
    $completed = Order::factory()->for($store)->create(['status' => OrderStatus::Completed, 'store_name' => 'Nome anterior']);
    $pending = Order::factory()->for($store)->create();
    $canceled = Order::factory()->for($store)->create(['status' => OrderStatus::Canceled]);
    $legacy = Order::factory()->create(['status' => OrderStatus::Completed]);
    OrderItem::factory()->for($completed)->create(['total_quantity' => 6]);
    OrderItem::factory()->for($completed)->create(['total_quantity' => 4]);
    OrderItem::factory()->for($pending)->create(['total_quantity' => 8]);
    OrderItem::factory()->for($canceled)->create(['total_quantity' => 7]);
    OrderItem::factory()->for($legacy)->create(['total_quantity' => 3]);

    $this->actingAs(User::factory()->stock()->create())
        ->get(route('stores.index', ['search' => 'CENTRO']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('stores/index')
            ->has('stores.data', 1)
            ->where('stores.data.0.id', $store->id)
            ->where('stores.data.0.shipped_quantity', 10)
            ->where('unlinkedQuantity', 3));
});
