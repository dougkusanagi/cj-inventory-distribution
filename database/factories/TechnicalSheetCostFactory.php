<?php

namespace Database\Factories;

use App\Models\CostItem;
use App\Models\TechnicalSheet;
use App\Models\TechnicalSheetCost;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TechnicalSheetCost>
 */
class TechnicalSheetCostFactory extends Factory
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
            'cost_item_id' => CostItem::factory(),
            'cost_name' => 'Mão de obra',
            'amount' => '8.20',
        ];
    }
}
