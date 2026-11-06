<?php

namespace Database\Factories;

use App\Enums\ProductionStage;
use App\Models\Product;
use App\Models\ProductionBatch;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<ProductionBatch> */
class ProductionBatchFactory extends Factory
{
    public function configure(): static
    {
        return $this->afterCreating(function (ProductionBatch $batch): void {
            $batch->update(['code' => 'L-'.str_pad((string) $batch->id, 6, '0', STR_PAD_LEFT)]);
        });
    }

    public function definition(): array
    {
        return [
            'code' => 'TEMP-'.Str::uuid(),
            'product_id' => Product::factory(),
            'quantity' => fake()->numberBetween(1, 100),
            'stage' => ProductionStage::Cutting,
            'stage_entered_at' => now(),
            'received_at' => now(),
            'version' => 1,
            'created_by' => User::factory(),
        ];
    }

    /**
     * Place the batch in a stage, already received by the sector.
     */
    public function inStage(ProductionStage $stage): static
    {
        return $this->state(fn (array $attributes): array => [
            'stage' => $stage,
            'received_at' => now(),
        ]);
    }

    /**
     * Leave the batch sent to its stage but not yet received.
     */
    public function awaitingReceipt(): static
    {
        return $this->state(fn (array $attributes): array => ['received_at' => null]);
    }

    /**
     * Make the batch stay in its stage longer than the stalled limit.
     */
    public function stalled(): static
    {
        return $this->state(fn (array $attributes): array => [
            'stage_entered_at' => now()->subDays(ProductionBatch::STALLED_AFTER_DAYS + 2),
        ]);
    }
}
