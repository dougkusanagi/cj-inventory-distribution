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

test('grade nova and reposição entries only need sack totals', function (StockOfferType $type) {
    $user = User::factory()->create();
    $product = Product::factory()->create();

    $this->actingAs($user)->post(route('stock-entries.store'), [
        'product_id' => $product->id,
        'stock_offer_type' => $type->value,
        'idempotency_key' => 'entry-totals-'.$type->value,
        'stock_volumes' => [
            ['total_quantity' => 13, 'items' => []],
            ['total_quantity' => 12, 'items' => []],
        ],
    ])->assertSessionHasNoErrors();

    $movement = StockMovement::query()->sole();

    expect($movement->reason)->toBe('Entrada de '.$type->label())
        ->and(StockOfferVolume::query()->sum('total_quantity'))->toBe(25)
        ->and(StockOfferVolume::query()->count())->toBe(2);
})->with([
    'grade nova' => [StockOfferType::NewGrade],
    'reposição' => [StockOfferType::Replenishment],
]);

test('grade furada entries still require a reason', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();

    $this->actingAs($user)->post(route('stock-entries.store'), [
        'product_id' => $product->id,
        'stock_offer_type' => StockOfferType::BrokenGrade->value,
        'idempotency_key' => 'entry-broken-without-reason',
        'stock_volumes' => [['total_quantity' => 5, 'items' => []]],
    ])->assertSessionHasErrors(['reason' => 'Informe o motivo da entrada.']);

    expect(StockMovement::query()->count())->toBe(0);
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

test('stock entry preselects the product sent from its page', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();

    $this->actingAs($user)
        ->get(route('stock-entries.create', ['product' => $product->id]))
        ->assertInertia(fn ($page) => $page
            ->component('stock-movements/entry')
            ->where('selectedProductId', $product->id));
});

test('stock entry returns to the product when started from its stock tab', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();

    $payload = [
        'product_id' => $product->id,
        'stock_offer_type' => StockOfferType::NewGrade->value,
        'reason' => 'Recebimento da fábrica',
        'notes' => null,
        'idempotency_key' => 'entry-from-product-001',
        'stock_volumes' => [[
            'total_quantity' => 8,
            'items' => [
                ['size' => 'M', 'is_active' => true, 'quantity' => 8],
            ],
        ]],
    ];

    $this->actingAs($user)
        ->post(route('stock-entries.store', ['return_to' => 'product']), $payload)
        ->assertRedirect(route('products.edit', $product));

    expect(StockMovement::query()->count())->toBe(1)
        ->and($product->fresh()->latestOffer->type)->toBe(StockOfferType::NewGrade);
});

test('stock exit lists only the selected product available sacks', function () {
    $user = User::factory()->create();
    $selectedVolume = movementVolume();
    movementVolume();

    $this->actingAs($user)
        ->get(route('stock-exits.create', [
            'product' => $selectedVolume->offer->product_id,
        ]))
        ->assertInertia(fn ($page) => $page
            ->component('stock-movements/exit')
            ->where('selectedProductId', $selectedVolume->offer->product_id)
            ->has('volumes', 1)
            ->where('volumes.0.id', $selectedVolume->id));

});

test('staff can recount known sizes from the product and records the difference', function () {
    $user = User::factory()->create();
    $volume = movementVolume();
    $item = $volume->items->sole();

    $this->actingAs($user)
        ->post(route('products.stock-adjustments.store', $volume->offer->product), [
            'volume_id' => $volume->id,
            'expected_version' => $volume->fresh()->stock_version,
            'items' => [[
                'id' => $item->id,
                'is_active' => true,
                'quantity' => 9,
            ]],
            'reason' => 'Contagem física',
            'idempotency_key' => 'adjustment-size-001',
        ])
        ->assertRedirect(route('products.edit', $volume->offer->product));

    $movement = StockMovement::query()->sole();

    expect($movement->type)->toBe(StockMovementType::Out)
        ->and($movement->source)->toBe(StockMovementSource::Adjustment)
        ->and($volume->refresh()->total_quantity)->toBe(9)
        ->and($item->refresh()->quantity)->toBe(9)
        ->and($movement->items->sole()->previous_state['total_quantity'])->toBe(12)
        ->and($movement->items->sole()->resulting_state['total_quantity'])->toBe(9)
        ->and($movement->items->sole()->movement_quantity)->toBe(3);

    $this->actingAs($user)
        ->get(route('stock-movements.show', $movement))
        ->assertInertia(fn ($page) => $page
            ->component('stock-movements/show')
            ->where('movement.items.0.previous_state.total_quantity', 12)
            ->where('movement.items.0.resulting_state.total_quantity', 9)
            ->where('movement.items.0.previous_state.sizes.0', [
                'size' => 'M',
                'quantity' => 12,
            ])
            ->where('movement.items.0.resulting_state.sizes.0', [
                'size' => 'M',
                'quantity' => 9,
            ]));
});

test('adjustments reject a stale sack version without overwriting a newer recount', function () {
    $user = User::factory()->create();
    $volume = movementVolume();
    $item = $volume->items->sole();
    $expectedVersion = $volume->fresh()->stock_version;

    $this->actingAs($user)->post(route('products.stock-adjustments.store', $volume->offer->product), [
        'volume_id' => $volume->id,
        'expected_version' => $expectedVersion,
        'items' => [['id' => $item->id, 'is_active' => true, 'quantity' => 8]],
        'reason' => 'Primeira contagem',
        'idempotency_key' => 'adjustment-first-count-001',
    ])->assertRedirect();

    $this->actingAs($user)->post(route('products.stock-adjustments.store', $volume->offer->product), [
        'volume_id' => $volume->id,
        'expected_version' => $expectedVersion,
        'items' => [['id' => $item->id, 'is_active' => true, 'quantity' => 9]],
        'reason' => 'Contagem desatualizada',
        'idempotency_key' => 'adjustment-stale-count-001',
    ])->assertInvalid([
        'volume_id' => 'Este saco mudou desde o início da contagem. Atualize a página e confira novamente.',
    ]);

    expect($volume->refresh()->total_quantity)->toBe(8)
        ->and(StockMovement::query()->count())->toBe(1);
});

test('staff can redistribute a sack between sizes without changing its total', function () {
    $user = User::factory()->create();
    $volume = movementVolume();
    $secondItem = $volume->items()->create(['size' => 'G', 'quantity' => 0, 'is_active' => true]);

    $this->actingAs($user)
        ->post(route('products.stock-adjustments.store', $volume->offer->product), [
            'volume_id' => $volume->id,
            'expected_version' => $volume->fresh()->stock_version,
            'items' => [
                ['id' => $volume->items->sole()->id, 'is_active' => true, 'quantity' => 10],
                ['id' => $secondItem->id, 'is_active' => true, 'quantity' => 2],
            ],
            'reason' => 'Recontagem de tamanhos',
            'idempotency_key' => 'recount-sizes-001',
        ])
        ->assertRedirect();

    expect(StockMovement::query()->sole()->type)->toBe(StockMovementType::Adjustment)
        ->and($volume->refresh()->total_quantity)->toBe(12)
        ->and($secondItem->refresh()->quantity)->toBe(2);
});

test('non-staff cannot adjust product stock', function () {
    $user = User::factory()->nonStaff()->create();
    $volume = movementVolume();
    $item = $volume->items->sole();

    $this->actingAs($user)
        ->post(route('products.stock-adjustments.store', $volume->offer->product), [
            'volume_id' => $volume->id,
            'expected_version' => $volume->fresh()->stock_version,
            'items' => [[
                'id' => $item->id,
                'is_active' => true,
                'quantity' => 9,
            ]],
            'reason' => 'Contagem física',
            'idempotency_key' => 'adjustment-non-staff-001',
        ])
        ->assertForbidden();

    expect(StockMovement::query()->count())->toBe(0)
        ->and($volume->refresh()->total_quantity)->toBe(12)
        ->and($item->refresh()->quantity)->toBe(12);
});

test('adjustments reject reserved sacks without changing stock', function () {
    $user = User::factory()->create();
    $volume = movementVolume();
    $item = $volume->items->sole();
    $order = Order::factory()->create();
    $volume->update(['current_order_id' => $order->id]);

    $this->actingAs($user)
        ->post(route('products.stock-adjustments.store', $volume->offer->product), [
            'volume_id' => $volume->id,
            'expected_version' => $volume->fresh()->stock_version,
            'items' => [[
                'id' => $item->id,
                'is_active' => true,
                'quantity' => 9,
            ]],
            'reason' => 'Contagem física',
            'idempotency_key' => 'adjustment-reserved-001',
        ])
        ->assertInvalid([
            'volume_id' => 'Selecione um saco disponível, sem reserva e sem retirada registrada.',
        ]);

    expect(StockMovement::query()->count())->toBe(0)
        ->and($volume->refresh()->total_quantity)->toBe(12)
        ->and($item->refresh()->quantity)->toBe(12);
});

test('adjustments reject a recount that does not change the sack', function () {
    $user = User::factory()->create();
    $volume = movementVolume();
    $item = $volume->items->sole();

    $this->actingAs($user)
        ->post(route('products.stock-adjustments.store', $volume->offer->product), [
            'volume_id' => $volume->id,
            'expected_version' => $volume->fresh()->stock_version,
            'items' => [[
                'id' => $item->id,
                'is_active' => true,
                'quantity' => 12,
            ]],
            'reason' => 'Contagem física',
            'idempotency_key' => 'adjustment-unchanged-001',
        ])
        ->assertInvalid([
            'items' => 'Altere pelo menos um tamanho ou uma quantidade antes de salvar.',
        ]);

    expect(StockMovement::query()->count())->toBe(0)
        ->and($volume->refresh()->total_quantity)->toBe(12)
        ->and($item->refresh()->quantity)->toBe(12);
});

test('adjustments are idempotent', function () {
    $user = User::factory()->create();
    $volume = movementVolume();
    $item = $volume->items->sole();
    $payload = [
        'volume_id' => $volume->id,
        'expected_version' => $volume->fresh()->stock_version,
        'items' => [[
            'id' => $item->id,
            'is_active' => true,
            'quantity' => 9,
        ]],
        'reason' => 'Contagem física',
        'idempotency_key' => 'adjustment-retry-001',
    ];

    $this->actingAs($user)
        ->post(route('products.stock-adjustments.store', $volume->offer->product), $payload)
        ->assertRedirect();
    $this->actingAs($user)
        ->post(route('products.stock-adjustments.store', $volume->offer->product), $payload)
        ->assertRedirect();

    expect(StockMovement::query()->count())->toBe(1)
        ->and($volume->refresh()->total_quantity)->toBe(9)
        ->and($item->refresh()->quantity)->toBe(9);
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
        ->assertInvalid(['volume_ids' => 'Selecione apenas sacos disponíveis, sem reserva e sem retirada registrada.']);

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
    ])->assertInvalid(['idempotency_key' => 'Esta movimentação já foi registrada com outras informações. Atualize a página e tente novamente.']);
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
    $thirdVolume = movementVolume();
    $fourthVolume = $firstVolume->offer->stockVolumes()->create(['total_quantity' => 12]);
    $this->actingAs($firstUser)->post(route('stock-exits.store'), [
        'volume_ids' => [$thirdVolume->id], 'reason' => 'Outro produto da Ana', 'idempotency_key' => 'exit-filter-third',
    ])->assertRedirect();
    $this->actingAs($secondUser)->post(route('stock-exits.store'), [
        'volume_ids' => [$fourthVolume->id], 'reason' => 'Mesmo produto com Bruno', 'idempotency_key' => 'exit-filter-fourth',
    ])->assertRedirect();

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

test('recounts reject incomplete repeated and foreign size selections without changing stock', function (string $selection, string $message) {
    $volume = movementVolume();
    $item = $volume->items->sole();
    $items = [['id' => $item->id, 'is_active' => true, 'quantity' => 9]];
    if ($selection === 'missing') {
        $items = [];
    } elseif ($selection === 'repeated') {
        $items[] = $items[0];
    } elseif ($selection === 'same size') {
        $items[] = ['size' => 'm', 'is_active' => true, 'quantity' => 1];
    } else {
        $other = movementVolume();
        $items[0]['id'] = $other->items->sole()->id;
    }

    $this->actingAs(User::factory()->create())
        ->post(route('products.stock-adjustments.store', $volume->offer->product), [
            'volume_id' => $volume->id, 'expected_version' => $volume->fresh()->stock_version,
            'items' => $items, 'total_quantity' => 9, 'reason' => 'Recontagem', 'idempotency_key' => 'invalid-selection',
        ])->assertInvalid(['items' => $message]);

    expect($volume->refresh()->total_quantity)->toBe(12);
    expect($item->refresh()->quantity)->toBe(12);
    $this->assertDatabaseCount('stock_offer_volume_items', $selection === 'foreign' ? 2 : 1);
    $this->assertDatabaseEmpty('stock_movements');
})->with([
    'omitted existing size' => ['missing', 'Envie todos os tamanhos do saco. Desative os que não foram encontrados.'],
    'repeated size identity' => ['repeated', 'Os tamanhos informados não pertencem a este saco ou estão repetidos.'],
    'case insensitive duplicate' => ['same size', 'Informe tamanhos diferentes e não vazios.'],
    'size from another sack' => ['foreign', 'Os tamanhos informados não pertencem a este saco ou estão repetidos.'],
]);

test('history searches order codes and product model snapshots', function () {
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
    $this->post(route('orders.store'), [
        'store_name' => 'Loja Centro', 'requester_name' => 'Ana', 'volume_ids' => [$secondVolume->id],
    ])->assertRedirect();
    $order = Order::query()->sole();
    $item = $order->items()->sole();
    $this->post(route('orders.items.separate', [$order, $item]))->assertRedirect();
    $this->post(route('orders.items.check', [$order, $item]))->assertRedirect();
    $this->post(route('orders.complete', $order))->assertRedirect();
    $movement = StockMovement::query()->latest('id')->firstOrFail();

    $this->actingAs($user)
        ->get(route('stock-movements.index', ['search' => 'MODELO-DOIS']))
        ->assertInertia(fn ($page) => $page
            ->has('movements.data', 1)
            ->where('movements.data.0.id', $movement->id)
            ->where('filters.has_filters', true));

    $this->actingAs($user)
        ->get(route('stock-movements.index', ['search' => $order->code]))
        ->assertInertia(fn ($page) => $page->has('movements.data', 1)
            ->where('movements.data.0.id', $movement->id));
});

test('stock history sorts by occurrence date and breaks ties by movement identity', function (string $sort, array $positions) {
    $user = User::factory()->create();
    $first = StockMovement::factory()->for($user, 'actor')->create(['occurred_at' => '2026-09-10 09:00:00']);
    $second = StockMovement::factory()->for($user, 'actor')->create(['occurred_at' => '2026-09-09 09:00:00']);
    $third = StockMovement::factory()->for($user, 'actor')->create(['occurred_at' => '2026-09-10 09:00:00']);
    $ids = [$first->id, $second->id, $third->id];

    $this->actingAs($user)->get(route('stock-movements.index', ['sort' => $sort]))
        ->assertInertia(fn ($page) => $page
            ->has('movements.data', 3)
            ->where('movements.data.0.id', $ids[$positions[0]])
            ->where('movements.data.1.id', $ids[$positions[1]])
            ->where('movements.data.2.id', $ids[$positions[2]]));
})->with(['oldest' => ['oldest', [1, 0, 2]], 'newest' => ['newest', [2, 0, 1]]]);

test('automatic movements cannot be reversed through the manual endpoint', function (StockMovementSource $source) {
    $user = User::factory()->create();
    $movement = StockMovement::factory()->for($user, 'actor')->create(['source' => $source]);

    $this->actingAs($user)->post(route('stock-movements.reverse', $movement), ['reason' => 'Correção'])
        ->assertInvalid(['movement' => 'Esta movimentação não pode ser estornada porque foi gerada automaticamente.']);

    $this->assertDatabaseCount('stock_movements', 1);
    expect($movement->reversals()->count())->toBe(0);
})->with([StockMovementSource::Order, StockMovementSource::Opening, StockMovementSource::Adjustment]);

test('a multi sack reversal rolls back earlier sacks when a later sack cannot be restored', function () {
    $user = User::factory()->create();
    $first = movementVolume();
    $second = movementVolume();
    $this->actingAs($user)->post(route('stock-exits.store'), [
        'volume_ids' => [$first->id, $second->id], 'reason' => 'Baixa de lote', 'idempotency_key' => 'exit-rollback',
    ])->assertRedirect();
    $movement = StockMovement::query()->sole();
    $second->refresh()->update(['current_order_id' => Order::factory()->create()->id]);

    $this->post(route('stock-movements.reverse', $movement), ['reason' => 'Lote recuperado'])
        ->assertInvalid(['movement' => 'Esta saída não pode ser estornada porque o saco já foi alterado.']);

    expect($first->refresh()->consumed_at)->not->toBeNull();
    expect($second->refresh()->consumed_at)->not->toBeNull();
    $this->assertDatabaseCount('stock_movements', 1);
    $this->assertDatabaseCount('stock_movement_items', 2);
    expect($movement->reversals()->count())->toBe(0);
});

test('entry reversal consumes its original sacks once and accepts an identical retry', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();
    $this->actingAs($user)->post(route('stock-entries.store'), [
        'product_id' => $product->id, 'stock_offer_type' => StockOfferType::Replenishment->value,
        'idempotency_key' => 'entry-reversal', 'stock_volumes' => [['total_quantity' => 8, 'items' => []]],
    ])->assertRedirect();
    $movement = StockMovement::query()->sole();
    $volume = StockOfferVolume::query()->sole();

    $this->post(route('stock-movements.reverse', $movement), ['reason' => 'Recebimento indevido'])->assertRedirect();
    $this->post(route('stock-movements.reverse', $movement), ['reason' => 'Recebimento indevido'])->assertRedirect();

    $reversal = $movement->reversals()->sole();
    expect($reversal->type)->toBe(StockMovementType::Out);
    expect($reversal->items()->sole()->stock_offer_volume_id)->toBe($volume->id);
    expect($volume->refresh()->consumed_at)->not->toBeNull();
    $this->assertDatabaseCount('stock_movements', 2);
    $this->assertDatabaseCount('stock_movement_items', 2);
});

test('entry reversal refuses a later movement even when both occurred at the same time', function () {
    $this->freezeTime();
    $user = User::factory()->create();
    $product = Product::factory()->create();
    $this->actingAs($user)->post(route('stock-entries.store'), [
        'product_id' => $product->id, 'stock_offer_type' => StockOfferType::Replenishment->value,
        'idempotency_key' => 'entry-before-exit', 'stock_volumes' => [['total_quantity' => 8, 'items' => []]],
    ])->assertRedirect();
    $entry = StockMovement::query()->sole();
    $volume = StockOfferVolume::query()->sole();
    $this->post(route('stock-exits.store'), [
        'volume_ids' => [$volume->id], 'reason' => 'Retirada', 'idempotency_key' => 'exit-after-entry',
    ])->assertRedirect();

    $this->post(route('stock-movements.reverse', $entry), ['reason' => 'Recebimento indevido'])
        ->assertInvalid(['movement' => 'Esta movimentação não pode ser estornada porque os mesmos sacos já foram movimentados depois.']);

    expect($volume->refresh()->consumed_at)->not->toBeNull();
    expect($entry->reversals()->count())->toBe(0);
    $this->assertDatabaseCount('stock_movements', 2);
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
        ->and(fn () => $movement->items()->sole()->update([
            'total_quantity' => $movement->items()->sole()->total_quantity + 1,
        ]))
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
