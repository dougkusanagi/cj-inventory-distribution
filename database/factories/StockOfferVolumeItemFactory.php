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

    /**
     * Set a known quantity for the size in this sack.
     */
    public function withQuantity(int $quantity): static
    {
        return $this->state([
            'quantity' => max(0, $quantity),
            'is_active' => true,
        ]);
    }

    /**
     * Mark the size as absent from this sack.
     */
    public function inactive(): static
    {
        return $this->state([
            'is_active' => false,
            'quantity' => null,
        ]);
    }
}
