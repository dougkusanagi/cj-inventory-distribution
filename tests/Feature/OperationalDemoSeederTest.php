<?php

use App\Enums\AuditAction;
use App\Enums\OrderEventType;
use App\Enums\OrderStatus;
use App\Enums\StockMovementSource;
use App\Models\AuditLog;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\StockMovement;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('seeds every operational entity and supported enum variant', function () {
    $this->seed(DatabaseSeeder::class);

    expect(Order::query()->count())->toBeGreaterThanOrEqual(count(OrderStatus::cases()))
        ->and(OrderEvent::query()->count())->toBe(count(OrderStatus::cases()) * count(OrderEventType::cases()))
        ->and(StockMovement::query()->where('source', StockMovementSource::Opening)->count())->toBeGreaterThan(0)
        ->and(StockMovement::query()->where('source', StockMovementSource::Manual)->count())->toBeGreaterThan(0)
        ->and(StockMovement::query()->where('source', StockMovementSource::Order)->count())->toBeGreaterThan(0)
        ->and(AuditLog::query()->count())->toBeGreaterThanOrEqual(count(AuditAction::cases()));

    foreach (OrderStatus::cases() as $status) {
        expect(Order::query()->where('status', $status)->exists())->toBeTrue();
    }

    foreach (AuditAction::cases() as $action) {
        expect(AuditLog::query()->where('action', $action)->exists())->toBeTrue();
    }
});
