<?php

namespace Database\Factories;

use App\Models\CostItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CostItem>
 */
class CostItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->words(3, true),
            'default_amount' => '8.20',
            'is_active' => true,
        ];
    }
}
