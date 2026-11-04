<?php

use App\Actions\Production\ManageProductionBatch;
use App\Enums\ProductionStage;
use App\Enums\WorkshopType;
use App\Models\AuditLog;
use App\Models\Product;
use App\Models\ProductionBatch;
use App\Models\ProductionBatchItem;
use App\Models\User;
use App\Models\Workshop;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

it('records an optional numeric or alphabetic size grid and its changes', function (): void {
    $admin = User::factory()->admin()->create();
    $action = app(ManageProductionBatch::class);
    $batch = $action->create(Product::factory()->create(['is_active' => true]), 5, null, $admin, [
        ['size' => ' 36 ', 'quantity' => 2], ['size' => 'GG', 'quantity' => 3],
    ]);
    expect($batch->items()->pluck('size')->all())->toBe(['36', 'GG']);
    $batch = $action->updateSizes($batch, [['size' => 'P', 'quantity' => 1], ['size' => 'M', 'quantity' => 4]], $batch->version, $admin);
    $event = $batch->events()->reorder('id', 'desc')->firstOrFail();
    expect($batch->items()->pluck('size')->all())->toBe(['P', 'M'])
        ->and($event->kind)->toBe('sizes_updated')
        ->and($event->sizes_before)->toBe([['size' => '36', 'quantity' => 2], ['size' => 'GG', 'quantity' => 3]])
        ->and($event->sizes_after)->toBe([['size' => 'P', 'quantity' => 1], ['size' => 'M', 'quantity' => 4]]);
    $batch = $action->updateSizes($batch, [], $batch->version, $admin);
    expect($batch->items()->count())->toBe(0);
});

it('rejects duplicate sizes, invalid totals and stale updates without changing the grid', function (): void {
    $admin = User::factory()->admin()->create();
    $action = app(ManageProductionBatch::class);
    $batch = $action->create(Product::factory()->create(['is_active' => true]), 5, null, $admin);
    foreach ([
        [['size' => 'M', 'quantity' => 2], ['size' => 'm', 'quantity' => 3]],
        [['size' => 'M', 'quantity' => 4]],
        [['size' => 'M', 'quantity' => -1], ['size' => 'G', 'quantity' => 6]],
    ] as $sizes) {
        expect(fn () => $action->updateSizes($batch, $sizes, 1, $admin))->toThrow(ValidationException::class);
    }
    expect(fn () => $action->updateSizes($batch, [['size' => 'M', 'quantity' => 5]], 2, $admin))->toThrow(ValidationException::class)
        ->and($batch->items()->count())->toBe(0)
        ->and($batch->fresh()->version)->toBe(1);
});

it('preserves every size when splitting a batch between workshops', function (): void {
    $admin = User::factory()->admin()->create();
    $action = app(ManageProductionBatch::class);
    $batch = $action->create(Product::factory()->create(['is_active' => true]), 10, null, $admin, [
        ['size' => '36', 'quantity' => 4], ['size' => 'G', 'quantity' => 6],
    ]);
    $first = Workshop::factory()->create(['type' => WorkshopType::Sewing]);
    $second = Workshop::factory()->create(['type' => WorkshopType::Sewing]);
    $allocations = [
        ['workshop_id' => $first->id, 'quantity' => 4, 'sizes' => [['size' => '36', 'quantity' => 1], ['size' => 'G', 'quantity' => 3]]],
        ['workshop_id' => $second->id, 'quantity' => 6, 'sizes' => [['size' => '36', 'quantity' => 3], ['size' => 'G', 'quantity' => 3]]],
    ];
    $bad = $allocations;
    $bad[1]['sizes'][0]['quantity'] = 2;
    expect(fn () => $action->split($batch, ProductionStage::Cutting, ProductionStage::Sewing, 1, $admin, $bad))->toThrow(ValidationException::class)
        ->and($batch->fresh()->split_at)->toBeNull()
        ->and(ProductionBatch::count())->toBe(1);
    $children = $action->split($batch, ProductionStage::Cutting, ProductionStage::Sewing, 1, $admin, $allocations);
    expect($children[0]->items()->pluck('quantity', 'size')->all())->toBe(['36' => 1, 'G' => 3])
        ->and($children[1]->items()->pluck('quantity', 'size')->all())->toBe(['36' => 3, 'G' => 3]);
});

it('rejects a split when child totals match but the amounts for a size do not', function (): void {
    $admin = User::factory()->admin()->create();
    $action = app(ManageProductionBatch::class);
    $batch = $action->create(Product::factory()->create(['is_active' => true]), 10, null, $admin, [
        ['size' => '36', 'quantity' => 4], ['size' => 'G', 'quantity' => 6],
    ]);
    $first = Workshop::factory()->create(['type' => WorkshopType::Sewing]);
    $second = Workshop::factory()->create(['type' => WorkshopType::Sewing]);
    $allocations = [
        ['workshop_id' => $first->id, 'quantity' => 4, 'sizes' => [['size' => '36', 'quantity' => 2], ['size' => 'G', 'quantity' => 2]]],
        ['workshop_id' => $second->id, 'quantity' => 6, 'sizes' => [['size' => '36', 'quantity' => 3], ['size' => 'G', 'quantity' => 3]]],
    ];
    expect(fn () => $action->split($batch, ProductionStage::Cutting, ProductionStage::Sewing, 1, $admin, $allocations))->toThrow(ValidationException::class)
        ->and($batch->fresh()->split_at)->toBeNull()
        ->and(ProductionBatch::query()->count())->toBe(1);
});

it('does not change the size grid when the batch is awaiting receipt or was split', function (): void {
    $admin = User::factory()->admin()->create();
    $action = app(ManageProductionBatch::class);
    $batch = $action->create(Product::factory()->create(['is_active' => true]), 5, null, $admin);
    $batch = $action->advance($batch, ProductionStage::Cutting, ProductionStage::Sewing, 1, $admin);
    expect(fn () => $action->updateSizes($batch, [['size' => 'M', 'quantity' => 5]], $batch->version, $admin))->toThrow(ValidationException::class)
        ->and($batch->items()->count())->toBe(0);
});

it('validates the grid through the endpoints and requires an explicit empty array to clear it', function (): void {
    $admin = User::factory()->admin()->create();
    $product = Product::factory()->create(['is_active' => true]);
    $this->actingAs($admin)->post(route('production.store'), [
        'product_id' => $product->id, 'quantity' => 5,
        'sizes' => [['size' => '34', 'quantity' => 2], ['size' => 'M', 'quantity' => 3]],
    ])->assertRedirect();
    $batch = ProductionBatch::query()->sole();
    $this->put(route('production.sizes.update', $batch), ['version' => $batch->version])->assertInvalid('sizes');
    expect($batch->items()->count())->toBe(2);
    $this->put(route('production.sizes.update', $batch), ['version' => $batch->version, 'sizes' => []])->assertRedirect();
    expect($batch->items()->count())->toBe(0);
});

it('does not allow other profiles or sectors to modify a size grid', function (): void {
    $admin = User::factory()->admin()->create();
    $action = app(ManageProductionBatch::class);
    $batch = $action->create(Product::factory()->create(['is_active' => true]), 5, null, $admin);
    $this->actingAs(User::factory()->marketing()->create())->put(route('production.sizes.update', $batch), [
        'version' => 1, 'sizes' => [['size' => 'M', 'quantity' => 5]],
    ])->assertForbidden();
    expect($batch->items()->count())->toBe(0);
});

it('displays sizes and their history on the production panel', function (): void {
    $admin = User::factory()->admin()->create();
    $action = app(ManageProductionBatch::class);
    $batch = $action->create(Product::factory()->create(['is_active' => true]), 5, null, $admin, [['size' => '36', 'quantity' => 5]]);
    $action->updateSizes($batch, [['size' => 'M', 'quantity' => 5]], 1, $admin);
    $this->actingAs($admin)->get(route('production.index'))->assertOk()
        ->assertInertia(fn ($page) => $page->component('production/index')
            ->where('batches.0.sizes.0.size', 'M')
            ->where('batches.0.sizes.0.quantity', 5)
            ->where('batches.0.events.1.kind', 'sizes_updated')
            ->where('batches.0.events.1.sizes_before.0.size', '36')
            ->where('batches.0.events.1.sizes_after.0.size', 'M'));
});

it('validates and persists the size distribution in the split endpoint', function (): void {
    $admin = User::factory()->admin()->create();
    $action = app(ManageProductionBatch::class);
    $batch = $action->create(Product::factory()->create(['is_active' => true]), 4, null, $admin, [['size' => 'P', 'quantity' => 2], ['size' => 'M', 'quantity' => 2]]);
    $one = Workshop::factory()->create(['type' => WorkshopType::Sewing]);
    $two = Workshop::factory()->create(['type' => WorkshopType::Sewing]);
    $data = ['stage' => 'cutting', 'target' => 'sewing', 'version' => 1, 'allocations' => [
        ['workshop_id' => $one->id, 'quantity' => 2, 'sizes' => [['size' => 'P', 'quantity' => 1], ['size' => 'M', 'quantity' => 1]]],
        ['workshop_id' => $two->id, 'quantity' => 2, 'sizes' => [['size' => 'P', 'quantity' => 1], ['size' => 'M', 'quantity' => 1]]],
    ]];
    $invalid = $data;
    $invalid['allocations'][0]['sizes'][0]['quantity'] = '';
    $this->actingAs($admin)->post(route('production.split', $batch), $invalid)->assertInvalid('allocations.0.sizes.0.quantity');
    $this->post(route('production.split', $batch), $data)->assertRedirect();
    expect(ProductionBatch::query()->where('parent_id', $batch->id)->count())->toBe(2)
        ->and($batch->fresh()->split_at)->not->toBeNull();
});

it('enforces case insensitive uniqueness for active sizes at the database boundary', function (): void {
    $admin = User::factory()->admin()->create();
    $batch = app(ManageProductionBatch::class)->create(Product::factory()->create(['is_active' => true]), 1, null, $admin, [['size' => 'GG', 'quantity' => 1]]);
    expect(fn () => DB::transaction(fn () => $batch->items()->create(['size' => 'gg', 'quantity' => 0, 'sort_order' => 1])))
        ->toThrow(QueryException::class)
        ->and($batch->items()->count())->toBe(1);
});

it('audits size changes and keeps previous items available in the trash', function (): void {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);
    $action = app(ManageProductionBatch::class);
    $batch = $action->create(Product::factory()->create(['is_active' => true]), 2, null, $admin, [['size' => 'M', 'quantity' => 2]]);
    $action->updateSizes($batch, [['size' => 'M', 'quantity' => 1], ['size' => 'G', 'quantity' => 1]], 1, $admin);

    expect(ProductionBatchItem::withTrashed()->where('production_batch_id', $batch->id)->count())->toBe(3)
        ->and(ProductionBatchItem::onlyTrashed()->where('production_batch_id', $batch->id)->count())->toBe(1)
        ->and(AuditLog::query()->where('auditable_type', ProductionBatchItem::class)->where('actor_id', $admin->id)->count())->toBe(4);
});

it('rejects an invalid grid at creation without creating a batch', function (): void {
    $admin = User::factory()->admin()->create();
    $product = Product::factory()->create(['is_active' => true]);
    $this->actingAs($admin)->post(route('production.store'), [
        'product_id' => $product->id, 'quantity' => 5,
        'sizes' => [['size' => 'M', 'quantity' => 2]],
    ])->assertInvalid('sizes');
    expect(ProductionBatch::query()->count())->toBe(0);
});

it('rejects modifications to an archived or completed batch', function (): void {
    $admin = User::factory()->admin()->create();
    $action = app(ManageProductionBatch::class);
    $batch = $action->create(Product::factory()->create(['is_active' => true]), 2, null, $admin);
    $one = Workshop::factory()->create(['type' => WorkshopType::Sewing]);
    $two = Workshop::factory()->create(['type' => WorkshopType::Sewing]);
    $action->split($batch, ProductionStage::Cutting, ProductionStage::Sewing, 1, $admin, [
        ['workshop_id' => $one->id, 'quantity' => 1], ['workshop_id' => $two->id, 'quantity' => 1],
    ]);
    expect(fn () => $action->updateSizes($batch, [['size' => 'P', 'quantity' => 2]], 2, $admin))->toThrow(ValidationException::class);
    $completed = $action->create(Product::factory()->create(['is_active' => true]), 1, null, $admin);
    foreach ([ProductionStage::Sewing, ProductionStage::Washing, ProductionStage::Dyeing, ProductionStage::Finishing, ProductionStage::Bagging, ProductionStage::Completed] as $target) {
        if ($completed->received_at === null) {
            $completed = $action->receive($completed, $completed->version, $admin);
        }
        $completed = $action->advance($completed, $completed->stage, $target, $completed->version, $admin);
    }
    expect(fn () => $action->updateSizes($completed, [['size' => 'P', 'quantity' => 1]], $completed->version, $admin))->toThrow(ValidationException::class)
        ->and($completed->items()->count())->toBe(0);
});
