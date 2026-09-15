<?php

use App\Enums\OrderStatus;
use App\Enums\StockMovementSource;
use App\Enums\StockMovementType;
use App\Enums\StockOfferType;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\StockMovementItem;
use App\Models\StockOfferVolume;
use App\Models\User;

function movementVolume(): StockOfferVolume
{
    $product = Product::factory()->create();
    $offer = $product->offers()->create(['type' => StockOfferType::Replenishment]);
    $volume = $offer->stockVolumes()->create(['total_quantity' => 12]);
    $volume->items()->create(['size' => 'M', 'quantity' => 12, 'is_active' => true]);

    return $volume->load(['items', 'offer.product.category']);
}

test('staff can register a whole-sack entry and retries are idempotent', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();
    $payload = [
        'product_id' => $product->id,
        'stock_offer_type' => StockOfferType::Replenishment->value,
        'reason' => 'Recebimento da fábrica',
        'notes' => 'Lote de setembro',
        'idempotency_key' => 'entry-september-001',
        'stock_volumes' => [[
            'total_quantity' => 10,
            'items' => [
                ['size' => 'M', 'is_active' => true, 'quantity' => 4],
                ['size' => 'G', 'is_active' => true, 'quantity' => 6],
            ],
        ]],
    ];

    $response = $this->actingAs($user)->post(route('stock-entries.store'), $payload);
    $movement = StockMovement::query()->sole();
    $volume = StockOfferVolume::query()->sole();

    $response->assertRedirect(route('stock-movements.show', $movement));
    expect($movement->type)->toBe(StockMovementType::In)
        ->and($movement->source)->toBe(StockMovementSource::Manual)
        ->and($movement->items)->toHaveCount(1)
        ->and($movement->items->sole()->total_quantity)->toBe(10)
        ->and($volume->code)->toBe('SC-'.str_pad((string) $volume->id, 6, '0', STR_PAD_LEFT));

    $this->actingAs($user)->post(route('stock-entries.store'), $payload)
        ->assertRedirect(route('stock-movements.show', $movement));

    expect(StockMovement::query()->count())->toBe(1)
        ->and(StockOfferVolume::query()->count())->toBe(1);
});

test('staff can register a manual exit only for an available sack', function () {
    $user = User::factory()->create();
    $volume = movementVolume();
    $payload = [
        'volume_ids' => [$volume->id],
        'reason' => 'Avaria no transporte',
        'idempotency_key' => 'exit-transport-001',
    ];

    $response = $this->actingAs($user)->post(route('stock-exits.store'), $payload);
    $movement = StockMovement::query()->sole();

    $response->assertRedirect(route('stock-movements.show', $movement));
    expect($movement->type)->toBe(StockMovementType::Out)
        ->and($movement->source)->toBe(StockMovementSource::Manual)
        ->and($volume->refresh()->consumed_at)->not->toBeNull();

    $this->actingAs($user)->post(route('stock-exits.store'), $payload)
        ->assertRedirect(route('stock-movements.show', $movement));

    expect(StockMovement::query()->count())->toBe(1);
});

test('manual exits cannot consume a reserved sack', function () {
    $user = User::factory()->create();
    $volume = movementVolume();
    $order = Order::factory()->create();
    $volume->update(['current_order_id' => $order->id]);

    $this->actingAs($user)
        ->post(route('stock-exits.store'), [
            'volume_ids' => [$volume->id],
            'reason' => 'Baixa manual',
            'idempotency_key' => 'exit-reserved-001',
        ])
        ->assertInvalid(['volume_ids' => 'Só é possível dar saída em sacos disponíveis, não reservados e não consumidos.']);

    expect(StockMovement::query()->count())->toBe(0)
        ->and($volume->refresh()->consumed_at)->toBeNull();
});

test('manual exits can consume a Grade Nova sack', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();
    $offer = $product->offers()->create(['type' => StockOfferType::NewGrade]);
    $volume = $offer->stockVolumes()->create(['total_quantity' => 3]);

    $this->actingAs($user)
        ->post(route('stock-exits.store'), [
            'volume_ids' => [$volume->id],
            'reason' => 'Uso interno',
            'idempotency_key' => 'exit-new-grade-001',
        ])
        ->assertRedirect();

    expect($volume->refresh()->consumed_at)->not->toBeNull();
});

test('completing an order creates exactly one order stock exit', function () {
    $user = User::factory()->create();
    $volume = movementVolume();

    $this->actingAs($user)->post(route('orders.store'), [
        'store_name' => 'Loja Centro',
        'requester_name' => 'Ana',
        'volume_ids' => [$volume->id],
    ]);
    $order = Order::query()->sole();
    $item = $order->items()->sole();

    $this->actingAs($user)->post(route('orders.items.separate', [$order, $item]));
    $this->actingAs($user)->post(route('orders.items.check', [$order, $item]));
    $this->actingAs($user)->post(route('orders.complete', $order))->assertRedirect();

    $movement = StockMovement::query()->where('source', StockMovementSource::Order)->sole();
    $completedEvent = OrderEvent::query()->where('order_id', $order->id)->where('event', 'completed')->sole();

    expect($order->refresh()->status)->toBe(OrderStatus::Completed)
        ->and($movement->order_id)->toBe($order->id)
        ->and($movement->items)->toHaveCount(1)
        ->and($completedEvent->metadata['stock_movement_id'])->toBe($movement->id);
});

test('cancelling an order releases the reservation without a movement', function () {
    $user = User::factory()->create();
    $volume = movementVolume();

    $this->actingAs($user)->post(route('orders.store'), [
        'store_name' => 'Loja Centro',
        'requester_name' => 'Ana',
        'volume_ids' => [$volume->id],
    ]);
    $order = Order::query()->sole();

    $this->actingAs($user)->post(route('orders.cancel', $order), ['reason' => 'Pedido duplicado']);

    expect($order->refresh()->status)->toBe(OrderStatus::Canceled)
        ->and($volume->refresh()->current_order_id)->toBeNull()
        ->and(StockMovement::query()->count())->toBe(0);
});

test('a manual movement can be reversed once while preserving the chain', function () {
    $user = User::factory()->create();
    $volume = movementVolume();

    $this->actingAs($user)->post(route('stock-exits.store'), [
        'volume_ids' => [$volume->id],
        'reason' => 'Avaria corrigida',
        'idempotency_key' => 'exit-reversible-001',
    ]);
    $movement = StockMovement::query()->sole();

    $this->actingAs($user)->post(route('stock-movements.reverse', $movement), [
        'reason' => 'Avaria não confirmada',
    ])->assertRedirect(route('stock-movements.show', $movement));

    $reversal = StockMovement::query()->where('reversal_of_id', $movement->id)->sole();

    expect($reversal->type)->toBe(StockMovementType::In)
        ->and($reversal->source)->toBe(StockMovementSource::Manual)
        ->and($volume->refresh()->consumed_at)->toBeNull();

    $this->actingAs($user)->post(route('stock-movements.reverse', $movement), [
        'reason' => 'Outro motivo',
    ])->assertInvalid(['idempotency_key' => 'A chave de idempotência já foi usada com outra movimentação.']);
});

test('the stock history lists immutable movement summaries', function () {
    $user = User::factory()->create();
    $volume = movementVolume();
    $this->actingAs($user)->post(route('stock-exits.store'), [
        'volume_ids' => [$volume->id],
        'reason' => 'Avaria',
        'idempotency_key' => 'exit-history-001',
    ]);
    $movement = StockMovement::query()->sole();

    $this->actingAs($user)
        ->get(route('stock-movements.index', ['type' => 'out', 'search' => $volume->code]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('stock-movements/index')
            ->where('movements.data.0.id', $movement->id)
            ->where('summary.exits', 1));
});

test('history filters isolate products and responsible users in its counters', function () {
    $firstUser = User::factory()->create(['name' => 'Ana Estoque']);
    $secondUser = User::factory()->create(['name' => 'Bruno Estoque']);
    $firstVolume = movementVolume();
    $secondVolume = movementVolume();

    $this->actingAs($firstUser)->post(route('stock-exits.store'), [
        'volume_ids' => [$firstVolume->id],
        'reason' => 'Avaria no primeiro lote',
        'idempotency_key' => 'exit-filter-first',
    ]);
    $this->actingAs($secondUser)->post(route('stock-exits.store'), [
        'volume_ids' => [$secondVolume->id],
        'reason' => 'Avaria no segundo lote',
        'idempotency_key' => 'exit-filter-second',
    ]);

    $this->actingAs($firstUser)
        ->get(route('stock-movements.index', [
            'type' => StockMovementType::Out->value,
            'actor' => $firstUser->id,
            'product' => $firstVolume->offer->product_id,
        ]))
        ->assertInertia(fn ($page) => $page
            ->has('movements.data', 1)
            ->where('movements.data.0.actor', $firstUser->name)
            ->where('filters.actor', $firstUser->id)
            ->where('filters.product', $firstVolume->offer->product_id)
            ->where('summary.count', 1)
            ->where('summary.exits', 1)
            ->where('summary.manual_exits', 1)
            ->where('summary.order_exits', 0)
            ->where('summary.reversals', 0));
});

test('history supports chronological sorting and searches order and model snapshots', function () {
    $user = User::factory()->create();
    $firstVolume = movementVolume();
    $firstVolume->offer->product->update(['model' => 'MODELO-UM']);
    $secondVolume = movementVolume();
    $secondVolume->offer->product->update(['model' => 'MODELO-DOIS']);

    $this->actingAs($user)->post(route('stock-exits.store'), [
        'volume_ids' => [$firstVolume->id],
        'reason' => 'Primeira saída',
        'idempotency_key' => 'exit-sort-first',
    ]);
    $this->actingAs($user)->post(route('stock-exits.store'), [
        'volume_ids' => [$secondVolume->id],
        'reason' => 'Segunda saída',
        'idempotency_key' => 'exit-sort-second',
    ]);

    $order = Order::factory()->create(['code' => 'PED-999999']);
    $movement = StockMovement::query()->latest('id')->firstOrFail();
    $movement->forceFill(['order_id' => $order->id])->saveQuietly();

    $this->actingAs($user)
        ->get(route('stock-movements.index', ['sort' => 'oldest', 'search' => 'MODELO-DOIS']))
        ->assertInertia(fn ($page) => $page
            ->has('movements.data', 1)
            ->where('movements.data.0.id', $movement->id)
            ->where('filters.sort', 'oldest')
            ->where('filters.has_filters', true));

    $this->actingAs($user)
        ->get(route('stock-movements.index', ['search' => 'PED-999999']))
        ->assertInertia(fn ($page) => $page->has('movements.data', 1));
});

test('the initial stock opening is idempotent and marks legacy sacks', function () {
    $volume = movementVolume();

    $this->artisan('stock:open-initial', ['--key' => 'opening-legacy-001'])
        ->assertSuccessful();

    $movement = StockMovement::query()->sole();

    expect($movement->source)->toBe(StockMovementSource::Opening)
        ->and($movement->type)->toBe(StockMovementType::In)
        ->and($movement->items)->toHaveCount(1)
        ->and($volume->refresh()->code)->toBe('SC-'.str_pad((string) $volume->id, 6, '0', STR_PAD_LEFT));

    $this->artisan('stock:open-initial', ['--key' => 'opening-legacy-001'])
        ->assertSuccessful();

    expect(StockMovement::query()->count())->toBe(1);
});

test('a confirmed sack is read-only in the product editor and backend', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();

    $this->actingAs($user)->post(route('stock-entries.store'), [
        'product_id' => $product->id,
        'stock_offer_type' => StockOfferType::Replenishment->value,
        'reason' => 'Recebimento',
        'idempotency_key' => 'entry-readonly-001',
        'stock_volumes' => [[
            'total_quantity' => 8,
            'items' => [['size' => 'M', 'is_active' => true, 'quantity' => 8]],
        ]],
    ])->assertRedirect();

    $volume = StockOfferVolume::query()->sole();

    $this->actingAs($user)
        ->get(route('products.edit', $product))
        ->assertInertia(fn ($page) => $page
            ->where('product.stock_volumes.0.is_locked', true));

    $this->actingAs($user)
        ->from(route('products.edit', $product))
        ->put(route('products.update', $product), [
            'name' => $product->name,
            'stock_offer_type' => StockOfferType::Replenishment->value,
            'stock_volumes' => [[
                'id' => $volume->id,
                'total_quantity' => 3,
                'items' => [['size' => 'M', 'is_active' => true, 'quantity' => 3]],
            ]],
        ])
        ->assertSessionHasErrors([
            'stock_volumes' => 'Sacos já confirmados em movimentações não podem ser alterados pelo cadastro do produto.',
        ]);

    expect($volume->refresh()->total_quantity)->toBe(8);
});

test('movement and item records cannot be edited or deleted', function () {
    $movement = StockMovement::factory()->create();
    StockMovementItem::factory()->for($movement, 'movement')->create();

    expect(fn () => $movement->update(['reason' => 'alterado']))
        ->toThrow(LogicException::class)
        ->and(fn () => $movement->delete())
        ->toThrow(LogicException::class)
        ->and(fn () => $movement->items()->sole()->update(['total_quantity' => 1]))
        ->toThrow(LogicException::class)
        ->and(fn () => $movement->items()->sole()->delete())
        ->toThrow(LogicException::class);
});

test('order events cannot be edited or deleted', function () {
    $order = Order::factory()->create();
    $event = $order->events()->create(['event' => 'created']);

    expect(fn () => $event->update(['reason' => 'alterado']))
        ->toThrow(LogicException::class)
        ->and(fn () => $event->delete())
        ->toThrow(LogicException::class);
});

test('movement snapshots remain readable after related stock is soft-deleted', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create(['name' => 'Produto histórico']);

    $this->actingAs($user)->post(route('stock-entries.store'), [
        'product_id' => $product->id,
        'stock_offer_type' => StockOfferType::Replenishment->value,
        'reason' => 'Entrada para baixa',
        'idempotency_key' => 'entry-snapshot-001',
        'stock_volumes' => [[
            'total_quantity' => 5,
            'items' => [['size' => 'M', 'is_active' => true, 'quantity' => 5]],
        ]],
    ]);
    $volume = StockOfferVolume::query()->sole();

    $this->actingAs($user)->post(route('stock-exits.store'), [
        'volume_ids' => [$volume->id],
        'reason' => 'Baixa histórica',
        'idempotency_key' => 'exit-snapshot-001',
    ]);
    $movement = StockMovement::query()
        ->where('source', StockMovementSource::Manual)
        ->where('type', StockMovementType::Out)
        ->sole();

    $product->delete();

    $this->actingAs($user)
        ->get(route('stock-movements.show', $movement))
        ->assertInertia(fn ($page) => $page
            ->where('movement.items.0.product_name', 'Produto histórico')
            ->where('movement.items.0.volume_code', $volume->code));
});
