<?php

use App\Actions\Stock\ManageInventoryCount;
use App\Enums\StockMovementSource;
use App\Enums\StockOfferType;
use App\Models\InventoryCount;
use App\Models\Order;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\StockOfferVolume;
use App\Models\User;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function inventoryVolume(): StockOfferVolume
{
    $product = Product::factory()->create();
    $offer = $product->offers()->create(['type' => StockOfferType::Replenishment]);
    $volume = $offer->stockVolumes()->create(['total_quantity' => 10]);
    $volume->items()->create(['size' => 'M', 'sort_order' => 0, 'is_active' => true, 'quantity' => 10]);

    return $volume->refresh()->load(['items', 'offer.product']);
}

/** @param array<int, StockOfferVolume> $volumes */
function openInventoryCount(array $volumes, User $actor): InventoryCount
{
    return app(ManageInventoryCount::class)->open([
        'volume_ids' => array_map(fn (StockOfferVolume $volume): int => $volume->id, $volumes),
        'reason' => 'Conferência mensal',
        'idempotency_key' => (string) Str::uuid(),
    ], $actor);
}

test('inventory selection and count routes render their matching screens', function () {
    $user = User::factory()->create();
    $volume = inventoryVolume();

    $this->actingAs($user)
        ->get(route('inventory.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('inventory/index')
            ->where('volumes.data.0.id', $volume->id));

    $this->actingAs($user)->post(route('inventory.store'), [
        'volume_ids' => [$volume->id],
        'reason' => 'Conferência mensal',
        'idempotency_key' => '323e4567-e89b-42d3-a456-426614174000',
    ])->assertRedirect();

    $count = InventoryCount::query()->sole();

    $this->actingAs($user)
        ->get(route('inventory.show', $count))
        ->assertInertia(fn (Assert $page) => $page
            ->component('inventory/show')
            ->where('inventory.id', $count->id)
            ->has('inventory.items', 1));
});

test('a balance keeps its count in draft until the final confirmation records the adjustment', function () {
    $user = User::factory()->create();
    $volume = inventoryVolume();

    $this->actingAs($user)->post(route('inventory.store'), [
        'volume_ids' => [$volume->id],
        'reason' => 'Balanço mensal',
        'idempotency_key' => '123e4567-e89b-42d3-a456-426614174000',
    ])->assertRedirect();

    $count = InventoryCount::query()->sole();
    $item = $count->items()->sole();

    $this->actingAs($user)->put(route('inventory.update', [$count, $item]), [
        'version' => 1,
        'items' => [['id' => $volume->items->sole()->id, 'is_active' => true, 'quantity' => 8]],
    ])->assertRedirect(route('inventory.show', $count));

    expect($volume->refresh()->total_quantity)->toBe(10)
        ->and($count->refresh()->status)->toBe('draft')
        ->and($count->version)->toBe(2)
        ->and($item->refresh()->counted_total)->toBe(8);

    $this->actingAs($user)->post(route('inventory.confirm', $count), ['version' => 2])
        ->assertRedirect(route('inventory.show', $count));

    expect($count->refresh()->status)->toBe('confirmed')
        ->and($volume->refresh()->total_quantity)->toBe(8)
        ->and(StockMovement::query()->sole()->source)->toBe(StockMovementSource::Adjustment);

    $movement = StockMovement::query()->sole();
    $this->post(route('inventory.confirm', $count), ['version' => 2])->assertRedirect();

    $this->assertDatabaseCount('stock_movements', 1);
    $this->assertDatabaseCount('stock_movement_items', 1);
    expect($count->refresh()->version)->toBe(3);
    expect($item->refresh()->stock_movement_id)->toBe($movement->id);
    expect($volume->refresh()->total_quantity)->toBe(8);
});

test('a balance refuses a saved count when its sack changed after opening', function () {
    $user = User::factory()->create();
    $volume = inventoryVolume();

    $this->actingAs($user)->post(route('inventory.store'), [
        'volume_ids' => [$volume->id],
        'reason' => 'Balanço mensal',
        'idempotency_key' => '223e4567-e89b-42d3-a456-426614174000',
    ]);

    $count = InventoryCount::query()->sole();
    $item = $count->items()->sole();
    $volume->refresh()->update(['total_quantity' => 9]);

    $this->actingAs($user)->put(route('inventory.update', [$count, $item]), [
        'version' => 1,
        'items' => [['id' => $volume->items->sole()->id, 'is_active' => true, 'quantity' => 8]],
    ])->assertInvalid([
        'inventory' => 'O saco '.$volume->id.' mudou durante o balanço. Atualize sua referência e faça uma nova contagem.',
    ]);

    expect($item->refresh()->counted_total)->toBeNull()
        ->and($count->refresh()->version)->toBe(1);
});

test('inventory opening retries reuse the same count and reject a changed selection', function () {
    $user = User::factory()->create();
    $first = inventoryVolume();
    $second = inventoryVolume();
    $payload = ['volume_ids' => [$first->id, $second->id], 'reason' => 'Balanço mensal',
        'idempotency_key' => '123e4567-e89b-42d3-a456-426614174000'];

    $this->actingAs($user)->post(route('inventory.store'), $payload)->assertRedirect();
    $count = InventoryCount::query()->sole();
    $this->post(route('inventory.store'), [...$payload, 'volume_ids' => [$second->id, $first->id]])
        ->assertRedirect(route('inventory.show', $count));
    $this->post(route('inventory.store'), [...$payload, 'volume_ids' => [$first->id]])
        ->assertInvalid(['volume_ids' => 'Esta solicitação já foi usada para outro balanço.']);

    $this->assertDatabaseCount('inventory_counts', 1);
    $this->assertDatabaseCount('inventory_count_items', 2);
    $this->assertDatabaseEmpty('stock_movements');
});

test('inventory opening rejects unavailable sacks without creating a partial count', function (string $state) {
    $user = User::factory()->create();
    $available = inventoryVolume();
    $unavailable = inventoryVolume();
    if ($state === 'reserved') {
        $unavailable->update(['current_order_id' => Order::factory()->create()->id]);
    } else {
        $unavailable->update(['consumed_at' => now()]);
    }

    $this->actingAs($user)->post(route('inventory.store'), [
        'volume_ids' => [$available->id, $unavailable->id], 'reason' => 'Conferência',
        'idempotency_key' => '123e4567-e89b-42d3-a456-426614174000',
    ])->assertInvalid(['inventory' => 'O saco '.$unavailable->id.' está reservado, consumido ou excluído. Regularize-o antes de contar.']);

    $this->assertDatabaseEmpty('inventory_counts');
    $this->assertDatabaseEmpty('inventory_count_items');
    expect($available->refresh()->total_quantity)->toBe(10);
})->with(['reserved', 'consumed']);

test('a stale inventory version cannot overwrite a newer draft count', function () {
    $user = User::factory()->create();
    $volume = inventoryVolume();
    $count = openInventoryCount([$volume], $user);
    $item = $count->items()->sole();
    $payload = ['version' => 1, 'items' => [['id' => $volume->items->sole()->id, 'is_active' => true, 'quantity' => 8]]];
    $this->actingAs($user)->put(route('inventory.update', [$count, $item]), $payload)->assertRedirect();

    $this->put(route('inventory.update', [$count, $item]), [...$payload,
        'items' => [['id' => $volume->items->sole()->id, 'is_active' => true, 'quantity' => 7]],
    ])->assertInvalid(['inventory' => 'Este balanço mudou ou já foi encerrado. Atualize a página.']);

    expect($item->refresh()->counted_total)->toBe(8);
    expect($count->refresh()->version)->toBe(2);
    expect($volume->refresh()->total_quantity)->toBe(10);
    $this->assertDatabaseEmpty('stock_movements');
});

test('inventory item routes cannot change an item belonging to another count', function (string $operation) {
    $user = User::factory()->create();
    $firstVolume = inventoryVolume();
    $secondVolume = inventoryVolume();
    $first = openInventoryCount([$firstVolume], $user);
    $second = openInventoryCount([$secondVolume], $user);
    $otherItem = $second->items()->sole();
    $this->actingAs($user);

    if ($operation === 'save') {
        $this->put(route('inventory.update', [$first, $otherItem]), [
            'version' => 1, 'items' => [['id' => $secondVolume->items->sole()->id, 'is_active' => true, 'quantity' => 8]],
        ])->assertNotFound();
    } else {
        $this->post(route('inventory.refresh-item', [$first, $otherItem]), ['version' => 1])->assertNotFound();
    }

    expect($otherItem->refresh()->counted_total)->toBeNull();
    expect($first->refresh()->version)->toBe(1);
    expect($second->refresh()->version)->toBe(1);
    $this->assertDatabaseEmpty('stock_movements');
})->with(['save', 'refresh']);

test('inventory confirmation rejects an uncounted sack without applying earlier counts', function () {
    $user = User::factory()->create();
    $first = inventoryVolume();
    $second = inventoryVolume();
    $count = openInventoryCount([$first, $second], $user);
    $item = $count->items()->where('stock_offer_volume_id', $first->id)->sole();
    $this->actingAs($user)->put(route('inventory.update', [$count, $item]), [
        'version' => 1, 'items' => [['id' => $first->items->sole()->id, 'is_active' => true, 'quantity' => 8]],
    ])->assertRedirect();

    $this->post(route('inventory.confirm', $count), ['version' => 2])
        ->assertInvalid(['inventory' => 'Conte todos os sacos antes de confirmar o balanço.']);

    expect($count->refresh()->status)->toBe('draft');
    expect($count->version)->toBe(2);
    expect($first->refresh()->total_quantity)->toBe(10);
    expect($second->refresh()->total_quantity)->toBe(10);
    $this->assertDatabaseEmpty('stock_movements');
});

test('inventory confirmation does not partially apply counts when a later sack changes', function () {
    $user = User::factory()->create();
    $first = inventoryVolume();
    $second = inventoryVolume();
    $count = openInventoryCount([$first, $second], $user);
    $this->actingAs($user);
    foreach ([$first, $second] as $index => $volume) {
        $item = $count->items()->where('stock_offer_volume_id', $volume->id)->sole();
        $this->put(route('inventory.update', [$count, $item]), [
            'version' => $index + 1, 'items' => [['id' => $volume->items->sole()->id, 'is_active' => true, 'quantity' => 8]],
        ])->assertRedirect();
    }
    $second->update(['total_quantity' => 9]);

    $this->post(route('inventory.confirm', $count), ['version' => 3])
        ->assertInvalid(['inventory' => 'O saco '.$second->id.' mudou durante o balanço. Atualize sua referência e faça uma nova contagem.']);

    expect($first->refresh()->total_quantity)->toBe(10);
    expect($first->items()->sole()->quantity)->toBe(10);
    expect($second->refresh()->total_quantity)->toBe(9);
    expect($count->refresh()->status)->toBe('draft');
    expect($count->version)->toBe(3);
    $this->assertDatabaseEmpty('stock_movements');
    expect($count->items()->whereNotNull('stock_movement_id')->count())->toBe(0);
});

test('refreshing a changed sack discards its old count and allows a new reference', function () {
    $user = User::factory()->create();
    $volume = inventoryVolume();
    $count = openInventoryCount([$volume], $user);
    $item = $count->items()->sole();
    $this->actingAs($user)->put(route('inventory.update', [$count, $item]), [
        'version' => 1, 'items' => [['id' => $volume->items->sole()->id, 'is_active' => true, 'quantity' => 8]],
    ])->assertRedirect();
    $volume->update(['total_quantity' => 9]);

    $this->post(route('inventory.refresh-item', [$count, $item]), ['version' => 2])->assertRedirect();

    expect($item->refresh()->counted_total)->toBeNull();
    expect($item->counted_items)->toBeNull();
    expect($item->snapshot['total_quantity'])->toBe(9);
    expect($item->expected_version)->toBe($volume->refresh()->stock_version);
    expect($count->refresh()->version)->toBe(3);
    $this->put(route('inventory.update', [$count, $item]), [
        'version' => 3, 'items' => [['id' => $volume->items->sole()->id, 'is_active' => true, 'quantity' => 7]],
    ])->assertRedirect();
    expect($item->refresh()->counted_total)->toBe(7);
    $this->assertDatabaseEmpty('stock_movements');
});

test('confirming identical counts creates no artificial stock movement', function () {
    $user = User::factory()->create();
    $volume = inventoryVolume();
    $count = openInventoryCount([$volume], $user);
    $item = $count->items()->sole();
    $this->actingAs($user)->put(route('inventory.update', [$count, $item]), [
        'version' => 1, 'items' => [['id' => $volume->items->sole()->id, 'is_active' => true, 'quantity' => 10]],
    ])->assertRedirect();

    $this->post(route('inventory.confirm', $count), ['version' => 2])->assertRedirect();

    expect($count->refresh()->status)->toBe('confirmed');
    expect($count->confirmed_by)->toBe($user->id);
    expect($count->confirmed_at)->not->toBeNull();
    expect($item->refresh()->stock_movement_id)->toBeNull();
    expect($volume->refresh()->total_quantity)->toBe(10);
    $this->assertDatabaseEmpty('stock_movements');
});

test('canceling a counted inventory preserves stock and prevents further writes', function () {
    $user = User::factory()->create();
    $volume = inventoryVolume();
    $count = openInventoryCount([$volume], $user);
    $item = $count->items()->sole();
    $payload = ['version' => 1, 'items' => [['id' => $volume->items->sole()->id, 'is_active' => true, 'quantity' => 8]]];
    $this->actingAs($user)->put(route('inventory.update', [$count, $item]), $payload)->assertRedirect();

    $this->post(route('inventory.cancel', $count), ['version' => 2])->assertRedirect();
    $this->post(route('inventory.confirm', $count), ['version' => 3])
        ->assertInvalid(['inventory' => 'Este balanço mudou ou já foi encerrado. Atualize a página.']);
    $this->put(route('inventory.update', [$count, $item]), [...$payload, 'version' => 3])
        ->assertInvalid(['inventory' => 'Este balanço mudou ou já foi encerrado. Atualize a página.']);

    expect($count->refresh()->status)->toBe('canceled');
    expect($count->version)->toBe(3);
    expect($item->refresh()->counted_total)->toBe(8);
    expect($volume->refresh()->total_quantity)->toBe(10);
    $this->assertDatabaseEmpty('stock_movements');
});

test('non staff users cannot confirm an inventory or change physical stock', function () {
    $volume = inventoryVolume();
    $count = openInventoryCount([$volume], User::factory()->create());

    $this->actingAs(User::factory()->nonStaff()->create())
        ->post(route('inventory.confirm', $count), ['version' => 1])->assertForbidden();

    expect($count->refresh()->status)->toBe('draft');
    expect($count->version)->toBe(1);
    expect($volume->refresh()->total_quantity)->toBe(10);
    $this->assertDatabaseEmpty('stock_movements');
});
