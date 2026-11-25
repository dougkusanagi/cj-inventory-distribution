<?php

namespace Database\Factories;

use App\Enums\MaterialType;
use App\Enums\MaterialUnit;
use App\Models\Material;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Material> */
class MaterialFactory extends Factory
{
    public function definition(): array
    {
        return [
            'code' => 'INS-'.Str::uuid(),
            'name' => fake()->words(3, true),
            'type' => MaterialType::Fabric,
            'unit' => MaterialUnit::Meter,
            'is_active' => true,
        ];
    }
}
