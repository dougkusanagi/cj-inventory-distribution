<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\StockMovementItem;
use App\Models\StockOffer;
use App\Models\StockOfferVolume;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StockMovementItem>
 */
class StockMovementItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'stock_movement_id' => StockMovement::factory(),
            'stock_offer_volume_id' => StockOfferVolume::factory(),
            'product_id' => Product::factory(),
            'stock_offer_id' => StockOffer::factory(),
            'volume_code_snapshot' => fake()->unique()->numerify('SC-######'),
            'product_code_snapshot' => fake()->unique()->numerify('CJ-######'),
            'product_name_snapshot' => fake()->words(3, true),
            'product_model_snapshot' => fake()->optional()->numerify('####'),
            'category_snapshot' => fake()->optional()->word(),
            'line_snapshot' => null,
            'offer_type_snapshot' => 'replenishment',
            'total_quantity' => fake()->numberBetween(1, 30),
            'size_grid_snapshot' => [['size' => 'M', 'quantity' => null]],
            'previous_state' => null,
            'resulting_state' => null,
        ];
    }
}
