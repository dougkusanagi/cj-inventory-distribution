<?php

use App\Enums\ProductionStage;
use App\Models\ProductionBatch;
use App\Models\User;

it('marks only unfinished batches past the stalled limit', function (): void {
    $limit = ProductionBatch::STALLED_AFTER_DAYS;
    $fresh = ProductionBatch::factory()->create(['stage' => ProductionStage::Sewing, 'stage_entered_at' => now()->subDays($limit)->addMinute()]);
    $stalled = ProductionBatch::factory()->create(['stage' => ProductionStage::Sewing, 'stage_entered_at' => now()->subDays($limit)->subMinute()]);
    $completed = ProductionBatch::factory()->create(['stage' => ProductionStage::Completed, 'stage_entered_at' => now()->subDays($limit * 4)]);

    expect($fresh->isStalled())->toBeFalse()
        ->and($stalled->isStalled())->toBeTrue()
        ->and($completed->isStalled())->toBeFalse()
        ->and(ProductionBatch::query()->stalled()->pluck('id')->all())->toBe([$stalled->id]);
});

it('shows stalled batches and a count per stage in the panel', function (): void {
    $limit = ProductionBatch::STALLED_AFTER_DAYS;
    ProductionBatch::factory()->create(['stage' => ProductionStage::Washing, 'stage_entered_at' => now()->subDays($limit + 3)]);
    ProductionBatch::factory()->create(['stage' => ProductionStage::Washing, 'stage_entered_at' => now()->subDays($limit + 1)]);
    ProductionBatch::factory()->create(['stage' => ProductionStage::Washing, 'stage_entered_at' => now()]);
    ProductionBatch::factory()->create(['stage' => ProductionStage::Completed, 'stage_entered_at' => now()->subDays($limit + 30)]);

    $this->actingAs(User::factory()->admin()->create())->get(route('production.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('stalledAfterDays', $limit)
            ->where('stages', fn ($stages) => $stages->firstWhere('value', 'washing')['stalled_batches'] === 2
                && $stages->firstWhere('value', 'completed')['stalled_batches'] === 0
                && $stages->firstWhere('value', 'sewing')['stalled_batches'] === 0)
            ->where('batches', fn ($batches) => $batches->where('stalled', true)->count() === 2
                && $batches->where('stalled', false)->count() === 2));
});

it('counts stalled batches only in the stages a worker may see', function (): void {
    $limit = ProductionBatch::STALLED_AFTER_DAYS;
    ProductionBatch::factory()->create(['stage' => ProductionStage::Cutting, 'stage_entered_at' => now()->subDays($limit + 2)]);
    ProductionBatch::factory()->create(['stage' => ProductionStage::Sewing, 'stage_entered_at' => now()->subDays($limit + 2)]);
    $worker = User::factory()->production(ProductionStage::Sewing)->create();

    $this->actingAs($worker)->get(route('production.index'))
        ->assertInertia(fn ($page) => $page
            ->has('stages', 1)
            ->where('stages.0.value', 'sewing')
            ->where('stages.0.stalled_batches', 1)
            ->has('batches', 1));
});
