<?php

use App\Actions\Production\ManageProductionBatch;
use App\Enums\ProductionStage;
use App\Enums\WorkshopType;
use App\Models\Product;
use App\Models\ProductionBatch;
use App\Models\StockMovement;
use App\Models\StockOfferVolume;
use App\Models\User;
use App\Models\Workshop;
use Illuminate\Validation\ValidationException;

it('splits a batch between workshops without counting its parent twice', function (): void {
    $admin = User::factory()->admin()->create();
    $action = app(ManageProductionBatch::class);
    $batch = $action->create(Product::factory()->create(['is_active' => true]), 10, null, $admin);
    $first = Workshop::factory()->create(['type' => WorkshopType::Sewing]);
    $second = Workshop::factory()->create(['type' => WorkshopType::Sewing]);
    $children = $action->split($batch, ProductionStage::Cutting, ProductionStage::Sewing, 1, $admin, [
        ['workshop_id' => $first->id, 'quantity' => 4],
        ['workshop_id' => $second->id, 'quantity' => 6],
    ]);

    expect($children)->toHaveCount(2)
        ->and($batch->fresh()->split_at)->not->toBeNull()
        ->and($children->pluck('parent_id')->all())->toBe([$batch->id, $batch->id])
        ->and($children->pluck('quantity')->all())->toBe([4, 6])
        ->and($children->every(fn (ProductionBatch $child): bool => $child->stage === ProductionStage::Sewing && $child->received_at === null))->toBeTrue();
    $this->actingAs($admin)->get(route('production.index'))->assertInertia(fn ($page) => $page->has('batches', 2)->where('stages.0.pieces', 0)->where('stages.1.pieces', 10));
    expect(fn () => $action->advance($batch, ProductionStage::Cutting, ProductionStage::Sewing, 1, $admin))->toThrow(ValidationException::class);
});

it('rejects invalid allocations atomically and stale attempts', function (): void {
    $admin = User::factory()->admin()->create();
    $action = app(ManageProductionBatch::class);
    $batch = $action->create(Product::factory()->create(['is_active' => true]), 10, null, $admin);
    $first = Workshop::factory()->create(['type' => WorkshopType::Sewing]);
    $second = Workshop::factory()->create(['type' => WorkshopType::Sewing]);
    foreach ([[[$first->id, 4], [$second->id, 5]], [[$first->id, 4], [$first->id, 6]], [[$first->id, 0], [$second->id, 10]], [[$first->id, 4.5], [$second->id, 5.5]]] as $rows) {
        $allocations = array_map(fn ($row) => ['workshop_id' => $row[0], 'quantity' => $row[1]], $rows);
        expect(fn () => $action->split($batch, ProductionStage::Cutting, ProductionStage::Sewing, 1, $admin, $allocations))->toThrow(ValidationException::class);
    }
    expect($batch->fresh()->split_at)->toBeNull()->and(ProductionBatch::query()->count())->toBe(1)->and($batch->events()->count())->toBe(1);
    expect(fn () => $action->split($batch, ProductionStage::Cutting, ProductionStage::Sewing, 2, $admin, [['workshop_id' => $first->id, 'quantity' => 4], ['workshop_id' => $second->id, 'quantity' => 6]]))->toThrow(ValidationException::class);
});

it('requires authorization and rejects invalid workshop assignments at the endpoint', function (): void {
    $admin = User::factory()->admin()->create();
    $batch = app(ManageProductionBatch::class)->create(Product::factory()->create(['is_active' => true]), 10, null, $admin);
    $first = Workshop::factory()->create(['type' => WorkshopType::Sewing]);
    $second = Workshop::factory()->create(['type' => WorkshopType::Washing]);
    $data = ['stage' => 'cutting', 'target' => 'sewing', 'version' => 1, 'allocations' => [['workshop_id' => $first->id, 'quantity' => 4], ['workshop_id' => $second->id, 'quantity' => 6]]];
    $this->actingAs(User::factory()->marketing()->create())->post(route('production.split', $batch), $data)->assertForbidden();
    $this->actingAs($admin)->post(route('production.split', $batch), $data)->assertInvalid('allocations');
    expect($batch->fresh()->split_at)->toBeNull()->and(ProductionBatch::query()->count())->toBe(1);
    $second->update(['type' => WorkshopType::Sewing, 'is_active' => false]);
    $this->post(route('production.split', $batch), $data)->assertInvalid('allocations');
    $second->update(['is_active' => true]);
    $this->post(route('production.split', $batch), $data)->assertRedirect();
    $child = ProductionBatch::query()->where('parent_id', $batch->id)->firstOrFail();
    $this->delete(route('production.destroy', $child), ['version' => $child->version])->assertInvalid('batch');
    $this->post(route('production.split', $batch), $data)->assertInvalid('version');
    expect(ProductionBatch::query()->count())->toBe(3);
});

it('rejects dividing an unreceived batch or skipping a production stage', function (): void {
    $admin = User::factory()->admin()->create();
    $action = app(ManageProductionBatch::class);
    $batch = $action->create(Product::factory()->create(['is_active' => true]), 10, null, $admin);
    $batch = $action->advance($batch, ProductionStage::Cutting, ProductionStage::Sewing, 1, $admin);
    $first = Workshop::factory()->create(['type' => WorkshopType::Washing]);
    $second = Workshop::factory()->create(['type' => WorkshopType::Washing]);
    $allocations = [['workshop_id' => $first->id, 'quantity' => 4], ['workshop_id' => $second->id, 'quantity' => 6]];

    expect(fn () => $action->split($batch, ProductionStage::Sewing, ProductionStage::Washing, 2, $admin, $allocations))->toThrow(ValidationException::class);
    $batch = $action->receive($batch, 2, $admin);
    expect(fn () => $action->split($batch, ProductionStage::Sewing, ProductionStage::Dyeing, 3, $admin, $allocations))->toThrow(ValidationException::class)
        ->and($batch->fresh()->split_at)->toBeNull()
        ->and(ProductionBatch::query()->count())->toBe(1);
});

it('does not reveal the state of a batch belonging to another sector', function (): void {
    $admin = User::factory()->admin()->create();
    $action = app(ManageProductionBatch::class);
    $batch = $action->create(Product::factory()->create(['is_active' => true]), 10, null, $admin);
    $action->advance($batch, ProductionStage::Cutting, ProductionStage::Sewing, 1, $admin);
    $worker = User::factory()->production(ProductionStage::Cutting)->create();
    $first = Workshop::factory()->create(['type' => WorkshopType::Sewing]);
    $second = Workshop::factory()->create(['type' => WorkshopType::Sewing]);

    $this->actingAs($worker)->post(route('production.split', $batch), [
        'stage' => 'cutting', 'target' => 'sewing', 'version' => 1,
        'allocations' => [['workshop_id' => $first->id, 'quantity' => 4], ['workshop_id' => $second->id, 'quantity' => 6]],
    ])->assertForbidden();
});

it('does not allow operations on the original batch after it is divided', function (): void {
    $admin = User::factory()->admin()->create();
    $action = app(ManageProductionBatch::class);
    $batch = $action->create(Product::factory()->create(['is_active' => true]), 10, null, $admin);
    $first = Workshop::factory()->create(['type' => WorkshopType::Sewing]);
    $second = Workshop::factory()->create(['type' => WorkshopType::Sewing]);
    $allocations = [['workshop_id' => $first->id, 'quantity' => 4], ['workshop_id' => $second->id, 'quantity' => 6]];
    $action->split($batch, ProductionStage::Cutting, ProductionStage::Sewing, 1, $admin, $allocations);
    $batch = $batch->fresh();

    expect(fn () => $action->advance($batch, ProductionStage::Cutting, ProductionStage::Sewing, $batch->version, $admin))->toThrow(ValidationException::class)
        ->and(fn () => $action->receive($batch, $batch->version, $admin))->toThrow(ValidationException::class)
        ->and(fn () => $action->undo($batch, 'Correção', $batch->version, $admin))->toThrow(ValidationException::class)
        ->and(fn () => $action->delete($batch, $batch->version, $admin))->toThrow(ValidationException::class)
        ->and(fn () => $action->split($batch, ProductionStage::Cutting, ProductionStage::Sewing, $batch->version, $admin, $allocations))->toThrow(ValidationException::class)
        ->and($batch->fresh()->events()->count())->toBe(2)
        ->and(ProductionBatch::query()->where('parent_id', $batch->id)->sum('quantity'))->toBe(10)
        ->and(StockOfferVolume::query()->count())->toBe(0)
        ->and(StockMovement::query()->count())->toBe(0);
});
