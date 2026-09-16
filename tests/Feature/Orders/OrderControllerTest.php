<?php

use App\Enums\OrderEventType;
use App\Enums\OrderStatus;
use App\Enums\StockOfferType;
use App\Models\CatalogSetting;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\Product;
use App\Models\StockOfferVolume;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function availableOrderVolume(): StockOfferVolume
{
    $product = Product::factory()->create();
    $offer = $product->offers()->create([
        'type' => StockOfferType::Replenishment,
        'is_active' => true,
    ]);
    $volume = $offer->stockVolumes()->create(['total_quantity' => 12]);
    $volume->items()->create(['size' => 'M', 'is_active' => true, 'quantity' => 12]);

    return $volume;
}

test('guests are redirected when visiting orders', function () {
    $this->get(route('orders.index'))->assertRedirect(route('login'));
});

test('non-staff users cannot access the internal order panel', function () {
    $user = User::factory()->nonStaff()->create();

    $this->actingAs($user)
        ->get(route('orders.index'))
        ->assertForbidden();
});

test('order creation lists only eligible unreserved sacks', function () {
    $available = availableOrderVolume();
    $newGrade = availableOrderVolume();
    $newGrade->offer->update(['type' => StockOfferType::NewGrade]);
    $reserved = availableOrderVolume();
    $reserved->update(['current_order_id' => Order::factory()->create()->id]);

    $this->actingAs(User::factory()->create())
        ->get(route('orders.create'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('orders/create')
            ->has('availableVolumes', 1)
            ->where('availableVolumes.0.id', $available->id));
});

test('authenticated users can create an order that snapshots and reserves sacks', function () {
    $volume = availableOrderVolume();

    $response = $this->actingAs(User::factory()->create())->post(route('orders.store'), [
        'store_name' => '  Loja Centro ',
        'requester_name' => ' Ana ',
        'whatsapp' => '5511999999999',
        'volume_ids' => [$volume->id],
    ]);

    $order = Order::query()->with('items')->sole();
    $response->assertRedirect(route('orders.show', $order));
    expect($order->code)->toBe('PED-000001')
        ->and($order->status)->toBe(OrderStatus::Pending)
        ->and($order->items)->toHaveCount(1)
        ->and($order->items->sole()->product_name_snapshot)->toBe($volume->offer->product->name)
        ->and($volume->refresh()->current_order_id)->toBe($order->id)
        ->and($volume->code)->toBe('SC-'.str_pad((string) $volume->id, 6, '0', STR_PAD_LEFT));
});

test('a reserved sack cannot be ordered twice', function () {
    $volume = availableOrderVolume();
    $volume->update(['current_order_id' => Order::factory()->create()->id]);

    $this->actingAs(User::factory()->create())->post(route('orders.store'), [
        'store_name' => 'Loja Centro',
        'requester_name' => 'Ana',
        'volume_ids' => [$volume->id],
    ])->assertInvalid(['volume_ids' => 'Um ou mais sacos não estão mais disponíveis. Atualize a seleção.']);

    expect(Order::query()->count())->toBe(1);
});

test('catalog retries with the same idempotency key return the original order', function () {
    $volume = availableOrderVolume();
    CatalogSetting::factory()->create(['whatsapp_number' => '5511988887777']);
    $payload = [
        'store_name' => 'Loja Centro',
        'requester_name' => 'Ana',
        'volume_ids' => [$volume->id],
        'idempotency_key' => 'retry-order-001',
    ];

    $this->post(route('catalog-orders.store'), $payload)->assertRedirect();
    $firstOrder = Order::query()->sole();

    $this->post(route('catalog-orders.store'), $payload)->assertRedirect();

    expect(Order::query()->count())->toBe(1)
        ->and($volume->refresh()->current_order_id)->toBe($firstOrder->id);

    $this->post(route('catalog-orders.store'), [
        ...$payload,
        'store_name' => 'Outra loja',
    ])->assertInvalid([
        'idempotency_key' => 'A chave de idempotência já foi usada com outro pedido.',
    ]);
});

test('order creation rolls back every reservation when one selected sack is unavailable', function () {
    $available = availableOrderVolume();
    $reserved = availableOrderVolume();
    $reserved->update(['current_order_id' => Order::factory()->create()->id]);

    $this->actingAs(User::factory()->create())
        ->post(route('orders.store'), [
            'store_name' => 'Loja Centro',
            'requester_name' => 'Ana',
            'volume_ids' => [$available->id, $reserved->id],
        ])
        ->assertInvalid(['volume_ids' => 'Um ou mais sacos não estão mais disponíveis. Atualize a seleção.']);

    expect(Order::query()->count())->toBe(1)
        ->and($available->refresh()->current_order_id)->toBeNull();
});

test('pending orders can be edited and canceled with their reservations released', function () {
    $volume = availableOrderVolume();
    $user = User::factory()->create();
    $this->actingAs($user)->post(route('orders.store'), [
        'store_name' => 'Loja Centro',
        'requester_name' => 'Ana',
        'volume_ids' => [$volume->id],
    ]);
    $order = Order::query()->sole();

    $this->actingAs($user)->put(route('orders.update', $order), [
        'store_name' => 'Loja Norte',
        'requester_name' => 'Beatriz',
    ])->assertRedirect(route('orders.show', $order));

    $this->actingAs($user)->post(route('orders.cancel', $order), [
        'reason' => 'Solicitação duplicada',
    ])->assertRedirect(route('orders.show', $order));

    expect($order->refresh()->status)->toBe(OrderStatus::Canceled)
        ->and($order->store_name)->toBe('Loja Norte')
        ->and($order->cancellation_reason)->toBe('Solicitação duplicada')
        ->and($volume->refresh()->current_order_id)->toBeNull()
        ->and(OrderEvent::query()->where('order_id', $order->id)->get()
            ->map(fn (OrderEvent $event): string => $event->event->value)->all())
        ->toContain(OrderEventType::Created->value, OrderEventType::Updated->value, OrderEventType::Canceled->value);
});

test('does not finalize an order before conference is complete', function () {
    $volume = availableOrderVolume();
    $user = User::factory()->create();
    $this->actingAs($user)->post(route('orders.store'), [
        'store_name' => 'Loja Centro',
        'requester_name' => 'Ana',
        'volume_ids' => [$volume->id],
    ]);
    $order = Order::query()->sole();

    $this->actingAs($user)->post(route('orders.complete', $order))
        ->assertInvalid(['order' => 'Todos os sacos precisam estar separados, conferidos e sem divergências antes da finalização.']);

    expect($order->refresh()->status)->toBe(OrderStatus::Pending)
        ->and($volume->refresh()->current_order_id)->toBe($order->id)
        ->and($volume->consumed_at)->toBeNull();
});

test('orders require complete conference and keep an audit trail', function () {
    $volume = availableOrderVolume();
    $user = User::factory()->create();
    $this->actingAs($user)->post(route('orders.store'), [
        'store_name' => 'Loja Centro',
        'requester_name' => 'Ana',
        'volume_ids' => [$volume->id],
    ]);
    $order = Order::query()->sole();
    $item = $order->items()->sole();

    $this->actingAs($user)->post(route('orders.complete', $order))->assertInvalid([
        'order' => 'Todos os sacos precisam estar separados, conferidos e sem divergências antes da finalização.',
    ]);

    $this->actingAs($user)
        ->post(route('orders.items.separate', [$order, $item]))
        ->assertRedirect();
    $this->actingAs($user)
        ->post(route('orders.items.check', [$order, $item]))
        ->assertRedirect();
    $this->actingAs($user)
        ->post(route('orders.items.report-divergence', [$order, $item]), [
            'reason' => 'Quantidade divergente',
        ])
        ->assertRedirect();

    expect($item->refresh()->checked_at)->toBeNull()
        ->and($item->divergence_note)->toBe('Quantidade divergente');

    $this->actingAs($user)->post(route('orders.complete', $order))->assertInvalid([
        'order' => 'Todos os sacos precisam estar separados, conferidos e sem divergências antes da finalização.',
    ]);

    $this->actingAs($user)
        ->post(route('orders.items.resolve-divergence', [$order, $item]), [
            'reason' => 'Contagem revisada',
        ])
        ->assertRedirect();
    $this->actingAs($user)
        ->post(route('orders.items.check', [$order, $item]))
        ->assertRedirect();
    $this->actingAs($user)->post(route('orders.complete', $order))
        ->assertRedirect(route('orders.show', $order));

    expect($order->refresh()->status)->toBe(OrderStatus::Completed)
        ->and(OrderEvent::query()->where('order_id', $order->id)->get()->map(
            fn (OrderEvent $event): string => $event->event->value,
        )->all())
        ->toContain(...array_map(
            fn (OrderEventType $event): string => $event->value,
            [
                OrderEventType::Created,
                OrderEventType::Separated,
                OrderEventType::Checked,
                OrderEventType::DivergenceReported,
                OrderEventType::DivergenceResolved,
                OrderEventType::Completed,
            ],
        ));
});

test('conference enforces its sequence and supports undoing progress', function () {
    $volume = availableOrderVolume();
    $user = User::factory()->create();
    $this->actingAs($user)->post(route('orders.store'), [
        'store_name' => 'Loja Centro',
        'requester_name' => 'Ana',
        'volume_ids' => [$volume->id],
    ]);
    $order = Order::query()->sole();
    $item = $order->items()->sole();

    $this->actingAs($user)
        ->post(route('orders.items.check', [$order, $item]))
        ->assertInvalid(['order_item' => 'Marque o saco como separado antes de conferi-lo.']);

    $this->actingAs($user)->post(route('orders.items.separate', [$order, $item]))->assertRedirect();
    $this->actingAs($user)->post(route('orders.items.check', [$order, $item]))->assertRedirect();
    $this->actingAs($user)->post(route('orders.items.undo-check', [$order, $item]))->assertRedirect();

    expect($item->refresh()->separated_at)->not->toBeNull()
        ->and($item->checked_at)->toBeNull();

    $this->actingAs($user)->post(route('orders.items.check', [$order, $item]))->assertRedirect();
    $this->actingAs($user)->post(route('orders.items.undo-separation', [$order, $item]))->assertRedirect();

    expect($item->refresh()->separated_at)->toBeNull()
        ->and($item->checked_at)->toBeNull()
        ->and(OrderEvent::query()->where('order_id', $order->id)->get()
            ->map(fn (OrderEvent $event): string => $event->event->value)->all())
        ->toContain(OrderEventType::CheckUndone->value, OrderEventType::SeparationUndone->value);
});

test('finalization rejects a reservation set that differs from the order items', function () {
    $orderedVolume = availableOrderVolume();
    $unexpectedVolume = availableOrderVolume();
    $user = User::factory()->create();
    $this->actingAs($user)->post(route('orders.store'), [
        'store_name' => 'Loja Centro',
        'requester_name' => 'Ana',
        'volume_ids' => [$orderedVolume->id],
    ]);
    $order = Order::query()->sole();
    $item = $order->items()->sole();
    $unexpectedVolume->update(['current_order_id' => $order->id]);
    $item->update(['separated_at' => now(), 'checked_at' => now()]);

    $this->actingAs($user)->post(route('orders.complete', $order))->assertInvalid([
        'order' => 'A reserva dos sacos mudou. Revise o pedido antes de finalizar.',
    ]);

    expect($order->refresh()->status)->toBe(OrderStatus::Pending)
        ->and($orderedVolume->refresh()->current_order_id)->toBe($order->id)
        ->and($orderedVolume->consumed_at)->toBeNull()
        ->and($unexpectedVolume->refresh()->current_order_id)->toBe($order->id)
        ->and($unexpectedVolume->consumed_at)->toBeNull();
});

test('an order item from another order cannot be updated through a scoped route', function () {
    $firstVolume = availableOrderVolume();
    $secondVolume = availableOrderVolume();
    $user = User::factory()->create();

    foreach ([$firstVolume, $secondVolume] as $volume) {
        $this->actingAs($user)->post(route('orders.store'), [
            'store_name' => 'Loja Centro',
            'requester_name' => 'Ana',
            'volume_ids' => [$volume->id],
        ]);
    }

    $orders = Order::query()->orderBy('id')->get();
    $firstItem = $orders[0]->items()->sole();
    $secondItem = $orders[1]->items()->sole();

    $this->actingAs($user)
        ->post(route('orders.items.separate', [$orders[0], $secondItem]))
        ->assertNotFound();

    expect($firstItem->refresh()->separated_at)->toBeNull()
        ->and($secondItem->refresh()->separated_at)->toBeNull();
});

test('order details keep the requester WhatsApp without an internal send link', function () {
    CatalogSetting::factory()->create(['whatsapp_number' => '5511988887777']);
    $volume = availableOrderVolume();
    $user = User::factory()->create();
    $this->actingAs($user)->post(route('orders.store'), [
        'store_name' => 'Loja Centro',
        'requester_name' => 'Ana',
        'whatsapp' => '5511999999999',
        'volume_ids' => [$volume->id],
    ]);
    $order = Order::query()->sole();

    $this->actingAs($user)
        ->get(route('orders.show', $order))
        ->assertInertia(fn (Assert $page) => $page
            ->where('order.whatsapp', '5511999999999')
            ->missing('order.whatsapp_url')
        );
});

test('finalizing an order consumes every reserved sack after conference', function () {
    $volume = availableOrderVolume();
    $user = User::factory()->create();
    $this->actingAs($user)->post(route('orders.store'), [
        'store_name' => 'Loja Centro',
        'requester_name' => 'Ana',
        'volume_ids' => [$volume->id],
    ]);
    $order = Order::query()->sole();

    $item = $order->items()->firstOrFail();
    $this->actingAs($user)
        ->post(route('orders.items.separate', [$order, $item]))
        ->assertRedirect();
    $this->actingAs($user)
        ->post(route('orders.items.check', [$order, $item]))
        ->assertRedirect();

    $this->actingAs($user)->post(route('orders.complete', $order))
        ->assertRedirect(route('orders.show', $order));

    expect($order->refresh()->status)->toBe(OrderStatus::Completed)
        ->and($order->completed_at)->not->toBeNull()
        ->and($volume->refresh()->current_order_id)->toBeNull()
        ->and($volume->consumed_at)->not->toBeNull();

    $this->actingAs($user)
        ->post(route('orders.items.undo-check', [$order, $item]))
        ->assertInvalid(['order' => 'A separação só pode ser alterada enquanto o pedido está pendente.']);
});
