<?php

namespace Database\Factories;

use App\Models\StockOffer;
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
            'stock_offer_id' => StockOffer::factory(),
            'sort_order' => 0,
            'total_quantity' => 0,
        ];
    }
}
