<?php

use App\Enums\OrderStatus;
use App\Enums\StockOfferType;
use App\Models\Order;
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
        ->and($volume->refresh()->current_order_id)->toBeNull();
});

test('finalizing an order consumes every reserved sack', function () {
    $volume = availableOrderVolume();
    $user = User::factory()->create();
    $this->actingAs($user)->post(route('orders.store'), [
        'store_name' => 'Loja Centro',
        'requester_name' => 'Ana',
        'volume_ids' => [$volume->id],
    ]);
    $order = Order::query()->sole();

    $this->actingAs($user)->post(route('orders.complete', $order))
        ->assertRedirect(route('orders.show', $order));

    expect($order->refresh()->status)->toBe(OrderStatus::Completed)
        ->and($order->completed_at)->not->toBeNull()
        ->and($volume->refresh()->current_order_id)->toBeNull()
        ->and($volume->consumed_at)->not->toBeNull();
});
