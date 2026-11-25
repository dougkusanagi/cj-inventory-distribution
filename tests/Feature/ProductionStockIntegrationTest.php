<?php

use App\Actions\Production\ManageProductionBatch;
use App\Enums\ProductionStage;
use App\Enums\TechnicalSheetStatus;
use App\Enums\WorkshopType;
use App\Models\Product;
use App\Models\ProductionBatch;
use App\Models\StockMovement;
use App\Models\StockOfferVolume;
use App\Models\TechnicalSheet;
use App\Models\User;
use App\Models\Workshop;

it('keeps the approved revision on the batch and its children after a new approval', function (): void {
    $admin = User::factory()->admin()->create();
    $product = Product::factory()->create(['is_active' => true]);
    $action = app(ManageProductionBatch::class);
    $legacyBatch = $action->create($product, 10, null, $admin);
    $first = TechnicalSheet::factory()->for($product)->create(['status' => TechnicalSheetStatus::Approved]);
    $batch = $action->create($product, 10, null, $admin);
    $first->update(['status' => TechnicalSheetStatus::Obsolete]);
    $second = TechnicalSheet::factory()->for($product)->create(['status' => TechnicalSheetStatus::Approved, 'revision' => 2]);

    $action->advance($batch, ProductionStage::Planning, ProductionStage::Cutting, 1, $admin);
    $action->receive($batch, 2, $admin);
    $workshops = Workshop::factory()->count(2)->create(['type' => WorkshopType::Sewing]);
    $children = $action->split($batch, ProductionStage::Cutting, ProductionStage::Sewing, 3, $admin, [
        ['workshop_id' => $workshops[0]->id, 'quantity' => 4],
        ['workshop_id' => $workshops[1]->id, 'quantity' => 6],
    ]);

    expect($legacyBatch->fresh()->technical_sheet_id)->toBeNull()
        ->and($batch->fresh()->technical_sheet_id)->toBe($first->id)
        ->and($children->pluck('technical_sheet_id')->all())->toBe([$first->id, $first->id])
        ->and($action->create($product, 10, null, $admin)->technical_sheet_id)->toBe($second->id);
});

it('counts linked sacks once, rejects an excess and reopens the balance after reversal', function (): void {
    $admin = User::factory()->admin()->create();
    $product = Product::factory()->replenishment()->create();
    $batch = ProductionBatch::factory()->for($product)->inStage(ProductionStage::Finishing)->create(['quantity' => 10]);
    $batch = app(ManageProductionBatch::class)->advance($batch, ProductionStage::Finishing, ProductionStage::Completed, 1, $admin);
    $payload = [
        'product_id' => $product->id,
        'production_batch_id' => $batch->id,
        'idempotency_key' => 'entry-batch',
        'stock_volumes' => [['total_quantity' => 3], ['total_quantity' => 4]],
    ];

    $this->actingAs($admin)->post(route('stock-entries.store'), $payload)->assertSessionHasNoErrors();
    $movement = StockMovement::query()->sole();
    $this->post(route('stock-entries.store'), $payload)->assertRedirect(route('stock-movements.show', $movement));
    $this->get(route('stock-movements.show', $movement))
        ->assertInertia(fn ($page) => $page->where('movement.items.0.production_batch_code', $batch->code));
    $this->get(route('production.index'))
        ->assertInertia(fn ($page) => $page->where('batches.0.pending_bagging', 3)->where('batches.0.can_undo', false));
    $this->get(route('stock-entries.create'))
        ->assertInertia(fn ($page) => $page->where('baggingBatches.0.pending', 3));

    $this->post(route('stock-entries.store'), [
        ...$payload,
        'idempotency_key' => 'entry-batch-excess',
        'stock_volumes' => [['total_quantity' => 2], ['total_quantity' => 2]],
    ])->assertInvalid('production_batch_id');

    expect(StockOfferVolume::query()->count())->toBe(2)
        ->and($batch->stockVolumes()->sum('bagged_quantity'))->toEqual(7);
    $undo = ['reason' => 'Conferência do lote', 'version' => $batch->version];
    $this->post(route('production.undo', $batch), $undo)->assertInvalid('batch');
    $this->post(route('stock-movements.reverse', $movement), ['reason' => 'Conferência da entrada'])->assertSessionHasNoErrors();
    expect($batch->stockVolumes()->sum('bagged_quantity'))->toEqual(0)
        ->and($batch->stockVolumes()->count())->toBe(2);
    $this->post(route('production.undo', $batch), $undo)->assertSessionHasNoErrors();
    expect($batch->fresh()->stage)->toBe(ProductionStage::Finishing);
});

it('rejects an origin from another product or a batch outside stock', function (bool $sameProduct): void {
    $product = Product::factory()->replenishment()->create();
    $batch = ProductionBatch::factory()->inStage($sameProduct ? ProductionStage::Finishing : ProductionStage::Completed)
        ->create($sameProduct ? ['product_id' => $product->id] : []);

    $this->actingAs(User::factory()->admin()->create())->post(route('stock-entries.store'), [
        'product_id' => $product->id,
        'production_batch_id' => $batch->id,
        'idempotency_key' => 'entry-invalid-batch',
        'stock_volumes' => [['total_quantity' => 1]],
    ])->assertInvalid('production_batch_id');

    expect(StockOfferVolume::query()->exists())->toBeFalse();
})->with([true, false]);
