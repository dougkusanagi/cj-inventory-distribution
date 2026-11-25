<?php

namespace Database\Factories;

use App\Models\Material;
use App\Models\MaterialPrice;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MaterialPrice>
 */
class MaterialPriceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'material_id' => Material::factory(),
            'unit_price' => '12.3400',
            'effective_from' => today()->toDateString(),
            'created_by' => User::factory(),
        ];
    }
}
