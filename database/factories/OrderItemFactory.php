<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\StockOfferVolume;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrderItem>
 */
class OrderItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'stock_offer_volume_id' => StockOfferVolume::factory(),
            'product_id' => Product::factory(),
            'product_code_snapshot' => fake()->unique()->numerify('CJ-######'),
            'product_name_snapshot' => fake()->words(3, true),
            'product_model_snapshot' => fake()->optional()->numerify('####'),
            'category_snapshot' => fake()->optional()->word(),
            'line_snapshot' => null,
            'offer_type_snapshot' => 'replenishment',
            'volume_code_snapshot' => fake()->unique()->numerify('SC-######'),
            'total_quantity' => fake()->numberBetween(1, 30),
            'size_grid' => [['size' => 'M', 'quantity' => null]],
        ];
    }
}
