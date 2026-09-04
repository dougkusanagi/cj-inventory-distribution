<?php

namespace Database\Factories;

use App\Models\StockOfferVolume;
use App\Models\StockOfferVolumeItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StockOfferVolumeItem>
 */
class StockOfferVolumeItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'stock_offer_volume_id' => StockOfferVolume::factory(),
            'size' => fake()->randomElement(['34', '36', '38', 'P', 'M', 'G']),
            'sort_order' => 0,
            'is_active' => true,
            'quantity' => null,
        ];
    }
}
