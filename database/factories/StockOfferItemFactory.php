<?php

namespace Database\Factories;

use App\Models\ProductVariant;
use App\Models\StockOffer;
use App\Models\StockOfferItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StockOfferItem>
 */
class StockOfferItemFactory extends Factory
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
            'product_variant_id' => ProductVariant::factory(),
            'quantity' => null,
            'is_active' => true,
        ];
    }
}
