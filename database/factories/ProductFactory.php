<?php

namespace Database\Factories;

use App\Enums\ProductLine;
use App\Models\Category;
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
            'category_id' => null,
            'line' => null,
            'notes' => fake()->optional()->sentence(),
            'is_active' => true,
        ];
    }

    /**
     * Assign the product to an existing category.
     */
    public function inCategory(Category $category): static
    {
        return $this->state([
            'category_id' => $category->getKey(),
        ]);
    }

    /**
     * Classify the product in the Slim line.
     */
    public function slim(): static
    {
        return $this->state([
            'line' => ProductLine::Slim,
        ]);
    }

    /**
     * Classify the product in the Plus line.
     */
    public function plus(): static
    {
        return $this->state([
            'line' => ProductLine::Plus,
        ]);
    }
}
