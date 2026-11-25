<?php

namespace Database\Factories;

use App\Enums\MaterialUnit;
use App\Enums\TechnicalMaterialRole;
use App\Models\Material;
use App\Models\TechnicalSheet;
use App\Models\TechnicalSheetMaterial;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TechnicalSheetMaterial>
 */
class TechnicalSheetMaterialFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'technical_sheet_id' => TechnicalSheet::factory(),
            'material_id' => Material::factory(['unit' => MaterialUnit::Meter]),
            'material_name' => 'Sarja',
            'role' => TechnicalMaterialRole::Component,
            'unit' => MaterialUnit::Meter,
            'quantity' => '1.250',
            'sort_order' => 0,
        ];
    }
}
