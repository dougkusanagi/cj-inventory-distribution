<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\StockOfferVolume;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StockOfferVolume>
 */
class StockOfferVolumeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'sort_order' => 0,
            'total_quantity' => 0,
        ];
    }

    /**
     * Set the number of pieces represented by this physical sack.
     */
    public function withTotal(int $totalQuantity): static
    {
        return $this->state([
            'total_quantity' => max(0, $totalQuantity),
        ]);
    }
}
