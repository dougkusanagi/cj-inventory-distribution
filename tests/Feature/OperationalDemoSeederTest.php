<?php

use App\Enums\AuditAction;
use App\Enums\OrderStatus;
use App\Enums\StockMovementSource;
use App\Models\AuditLog;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\OrderItem;
use App\Models\StockMovement;
use App\Models\StockMovementItem;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('seeds complete order scenarios with physical sacks and conference data', function () {
    $this->seed(DatabaseSeeder::class);

    $pending = Order::query()
        ->with('items.stockVolume')
        ->where('code', 'DEMO-PED-PENDING')
        ->sole();
    $completed = Order::query()
        ->with('items.stockVolume')
        ->where('code', 'DEMO-PED-COMPLETED')
        ->sole();
    $canceled = Order::query()
        ->with('items.stockVolume')
        ->where('code', 'DEMO-PED-CANCELED')
        ->sole();

    expect(Order::query()->count())->toBe(3)
        ->and($pending->status)->toBe(OrderStatus::Pending)
        ->and($pending->items)->toHaveCount(2)
        ->and($completed->status)->toBe(OrderStatus::Completed)
        ->and($completed->items)->toHaveCount(2)
        ->and($canceled->status)->toBe(OrderStatus::Canceled)
        ->and($canceled->items)->toHaveCount(1)
        ->and(StockMovement::query()->where('source', StockMovementSource::Opening)->count())->toBeGreaterThan(0)
        ->and(StockMovement::query()->where('source', StockMovementSource::Manual)->count())->toBeGreaterThan(0)
        ->and(StockMovement::query()->where('source', StockMovementSource::Order)->where('order_id', $completed->getKey())->count())->toBe(1)
        ->and(OrderEvent::query()->count())->toBe(9)
        ->and(OrderItem::query()->count())->toBe(5)
        ->and(StockMovementItem::query()->count())->toBe(4)
        ->and(AuditLog::query()->count())->toBeGreaterThanOrEqual(count(AuditAction::cases()));

    foreach ($pending->items as $item) {
        expect($item->stockVolume->current_order_id)->toBe($pending->getKey())
            ->and($item->separated_at)->toBeNull()
            ->and($item->checked_at)->toBeNull()
            ->and($item->size_grid)->not->toBeEmpty();
    }

    foreach ($completed->items as $item) {
        expect($item->stockVolume->current_order_id)->toBeNull()
            ->and($item->stockVolume->consumed_at)->not->toBeNull()
            ->and($item->separated_at)->not->toBeNull()
            ->and($item->checked_at)->not->toBeNull();
    }

    foreach ($canceled->items as $item) {
        expect($item->stockVolume->current_order_id)->toBeNull()
            ->and($item->stockVolume->consumed_at)->toBeNull();
    }

    foreach (AuditAction::cases() as $action) {
        expect(AuditLog::query()->where('action', $action)->exists())->toBeTrue();
    }
});

test('seeding the operational scenarios is idempotent', function () {
    $this->seed(DatabaseSeeder::class);

    $counts = [
        'orders' => Order::query()->count(),
        'order_items' => OrderItem::query()->count(),
        'order_events' => OrderEvent::query()->count(),
        'stock_movements' => StockMovement::query()->count(),
        'stock_movement_items' => StockMovementItem::query()->count(),
        'audit_logs' => AuditLog::query()->count(),
    ];

    $this->seed(DatabaseSeeder::class);

    expect([
        'orders' => Order::query()->count(),
        'order_items' => OrderItem::query()->count(),
        'order_events' => OrderEvent::query()->count(),
        'stock_movements' => StockMovement::query()->count(),
        'stock_movement_items' => StockMovementItem::query()->count(),
        'audit_logs' => AuditLog::query()->count(),
    ])->toBe($counts);
});

test('repairs legacy demo orders that were seeded without items', function () {
    Order::factory()->create([
        'code' => 'DEMO-PED-PENDING',
        'status' => OrderStatus::Pending,
    ]);
    Order::factory()->create([
        'code' => 'DEMO-PED-COMPLETED',
        'status' => OrderStatus::Completed,
    ]);
    Order::factory()->create([
        'code' => 'DEMO-PED-CANCELED',
        'status' => OrderStatus::Canceled,
    ]);

    $this->seed(DatabaseSeeder::class);

    expect(Order::query()->count())->toBe(3)
        ->and(OrderItem::query()->count())->toBe(5)
        ->and(Order::query()->where('code', 'DEMO-PED-PENDING')->value('status'))->toBe(OrderStatus::Pending)
        ->and(Order::query()->where('code', 'DEMO-PED-COMPLETED')->value('status'))->toBe(OrderStatus::Completed)
        ->and(Order::query()->where('code', 'DEMO-PED-CANCELED')->value('status'))->toBe(OrderStatus::Canceled);
});
