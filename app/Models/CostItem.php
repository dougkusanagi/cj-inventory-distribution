<?php

namespace App\Models;

use App\Enums\CostSurchargeType;
use Database\Factories\CostItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['name', 'default_amount', 'surcharge_type', 'surcharge_value', 'is_active'])]
class CostItem extends Model
{
    /** @use HasFactory<CostItemFactory> */
    use HasFactory;

    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'default_amount' => 'decimal:2',
            'surcharge_type' => CostSurchargeType::class,
            'surcharge_value' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }
}
