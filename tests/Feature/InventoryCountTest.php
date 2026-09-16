<?php

use App\Enums\StockMovementSource;
use App\Enums\StockOfferType;
use App\Models\InventoryCount;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\StockOfferVolume;
use App\Models\User;

function inventoryVolume(): StockOfferVolume
{
    $product = Product::factory()->create();
    $offer = $product->offers()->create(['type' => StockOfferType::Replenishment]);
    $volume = $offer->stockVolumes()->create(['total_quantity' => 10]);
    $volume->items()->create(['size' => 'M', 'sort_order' => 0, 'is_active' => true, 'quantity' => 10]);

    return $volume->load(['items', 'offer.product']);
}

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
