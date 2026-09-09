<?php

namespace Database\Factories;

use App\Enums\StockOfferType;
use App\Models\Product;
use App\Models\StockOffer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StockOffer>
 */
class StockOfferFactory extends Factory
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
            'type' => StockOfferType::NewGrade,
            'is_active' => true,
            'notes' => null,
        ];
    }

    /**
     * Create an offer for regular stock replenishment.
     */
    public function replenishment(): static
    {
        return $this->state([
            'type' => StockOfferType::Replenishment,
        ]);
    }

    /**
     * Create an offer for a broken grade.
     */
    public function brokenGrade(): static
    {
        return $this->state([
            'type' => StockOfferType::BrokenGrade,
        ]);
    }

    /**
     * Keep the offer out of the catalog.
     */
    public function inactive(): static
    {
        return $this->state([
            'is_active' => false,
        ]);
    }
}
