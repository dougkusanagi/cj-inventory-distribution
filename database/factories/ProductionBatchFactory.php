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
            'version' => 1,
            'created_by' => User::factory(),
        ];
    }
}
