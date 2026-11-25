<?php

namespace App\Models;

use App\Enums\CostSurchargeType;
use Database\Factories\TechnicalSheetCostFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $cost_item_id
 * @property string $cost_name
 * @property string $amount
 * @property ?CostSurchargeType $surcharge_type
 * @property ?string $surcharge_value
 */
#[Fillable(['cost_item_id', 'cost_name', 'amount', 'surcharge_type', 'surcharge_value'])]
class TechnicalSheetCost extends Model
{
    /** @use HasFactory<TechnicalSheetCostFactory> */
    use HasFactory;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'surcharge_type' => CostSurchargeType::class, 'surcharge_value' => 'decimal:2'];
    }
}
