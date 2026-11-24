<?php

use App\Actions\Production\ManageProductionBatch;
use App\Enums\ProductionStage;
use App\Enums\WorkshopType;
use App\Models\Product;
use App\Models\ProductionBatch;
use App\Models\User;
use App\Models\Workshop;
use Illuminate\Support\Facades\DB;

it('migrates legacy lots and assignments without rewriting historical events', function (): void {
    $admin = User::factory()->admin()->create();
    $batch = receivedCuttingBatch(Product::factory()->create(), 10, null, $admin);
    $batch->update(['stage' => ProductionStage::Dyeing]);
    $stock = ProductionBatch::factory()->inStage(ProductionStage::Bagging)->create();
    $worker = User::factory()->production(ProductionStage::Washing, ProductionStage::Dyeing, ProductionStage::Bagging)->create();
    $events = DB::table('production_batch_events')->get()->toArray();
    $migration = require database_path('migrations/2026_11_16_100904_unify_production_stages_and_add_planning.php');
    $migration->up();

    expect($batch->fresh()->stage)->toBe(ProductionStage::Washing)
        ->and($batch->fresh()->version)->toBe(2)
        ->and($stock->fresh()->stage)->toBe(ProductionStage::Completed)
        ->and($stock->fresh()->completed_at)->not->toBeNull()
        ->and($worker->productionStages()->pluck('stage')->sort()->values()->all())->toBe(['completed', 'washing'])
        ->and(DB::table('production_batch_events')->get()->toArray())->toEqual($events);
});

it('starts in planning and accepts dyeing workshops in the laundry stage', function (): void {
    $admin = User::factory()->admin()->create();
    $action = app(ManageProductionBatch::class);
    $batch = $action->create(Product::factory()->create(['is_active' => true]), 10, null, $admin);
    expect($batch->stage)->toBe(ProductionStage::Planning);
    foreach ([ProductionStage::Cutting, ProductionStage::Sewing, ProductionStage::Washing] as $stage) {
        if ($batch->received_at === null) {
            $batch = $action->receive($batch, $batch->version, $admin);
        }
        $workshop = $stage === ProductionStage::Washing ? Workshop::factory()->create(['type' => WorkshopType::Dyeing]) : null;
        $batch = $action->advance($batch, $batch->stage, $stage, $batch->version, $admin, $workshop?->id);
    }
    expect($batch->workshop_id)->toBe($workshop->id)
        ->and(ProductionStage::Washing->canMoveTo(ProductionStage::Finishing))->toBeTrue()
        ->and(ProductionStage::Washing->canMoveTo(ProductionStage::Dyeing))->toBeFalse();
});
