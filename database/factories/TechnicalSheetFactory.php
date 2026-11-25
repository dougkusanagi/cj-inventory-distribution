<?php

namespace Database\Factories;

use App\Enums\TechnicalSheetStatus;
use App\Models\Product;
use App\Models\TechnicalSheet;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TechnicalSheet>
 */
class TechnicalSheetFactory extends Factory
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
            'revision' => 1,
            'version' => 1,
            'status' => TechnicalSheetStatus::Draft,
            'created_by' => User::factory(),
        ];
    }
}
