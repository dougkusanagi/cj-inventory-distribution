<?php

namespace App\Models;

use Database\Factories\MaterialPriceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $unit_price
 */
#[Fillable(['unit_price', 'effective_from', 'created_by'])]
class MaterialPrice extends Model
{
    /** @use HasFactory<MaterialPriceFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return ['unit_price' => 'decimal:4'];
    }
}
