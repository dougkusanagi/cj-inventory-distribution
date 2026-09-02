<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => 'CJ-'.fake()->unique()->numerify('######'),
            'model' => fake()->optional()->numerify('####'),
            'name' => fake()->words(3, true),
            'notes' => fake()->optional()->sentence(),
            'is_active' => true,
        ];
    }
}
