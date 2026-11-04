<?php

namespace Database\Factories;

use App\Models\ProductionBatch;
use App\Models\ProductionBatchItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ProductionBatchItem> */
class ProductionBatchItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'production_batch_id' => ProductionBatch::factory()->state(['quantity' => 1]),
            'size' => fake()->unique()->numerify('##'),
            'quantity' => 1,
            'sort_order' => 0,
        ];
    }
}
