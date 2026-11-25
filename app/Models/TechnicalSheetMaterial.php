<?php

namespace App\Models;

use App\Enums\MaterialUnit;
use App\Enums\TechnicalMaterialRole;
use Database\Factories\TechnicalSheetMaterialFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $material_id
 * @property string $material_name
 * @property TechnicalMaterialRole $role
 * @property MaterialUnit $unit
 * @property string $quantity
 * @property ?string $unit_price_snapshot
 * @property ?string $sale_price
 */
#[Fillable(['material_id', 'material_name', 'role', 'unit', 'quantity', 'sort_order', 'unit_price_snapshot', 'sale_price'])]
class TechnicalSheetMaterial extends Model
{
    /** @use HasFactory<TechnicalSheetMaterialFactory> */
    use HasFactory;

    /** @return BelongsTo<Material, $this> */
    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class)->withTrashed();
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['role' => TechnicalMaterialRole::class, 'unit' => MaterialUnit::class, 'quantity' => 'decimal:3', 'unit_price_snapshot' => 'decimal:4', 'sale_price' => 'decimal:2'];
    }
}
