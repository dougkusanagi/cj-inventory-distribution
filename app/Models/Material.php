<?php

namespace App\Models;

use App\Enums\MaterialType;
use App\Enums\MaterialUnit;
use Database\Factories\MaterialFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property string $code
 * @property string $name
 * @property MaterialType $type
 * @property MaterialUnit $unit
 * @property bool $is_active
 */
#[Fillable(['code', 'name', 'type', 'unit', 'is_active'])]
class Material extends Model
{
    /** @use HasFactory<MaterialFactory> */
    use HasFactory;

    use SoftDeletes;

    /** @return HasMany<MaterialPrice, $this> */
    public function prices(): HasMany
    {
        return $this->hasMany(MaterialPrice::class);
    }

    /** @return HasMany<TechnicalSheetMaterial, $this> */
    public function sheetLines(): HasMany
    {
        return $this->hasMany(TechnicalSheetMaterial::class);
    }

    /** @return HasOne<MaterialPrice, $this> */
    public function effectivePrice(): HasOne
    {
        return $this->hasOne(MaterialPrice::class)->ofMany(
            ['effective_from' => 'max', 'id' => 'max'],
            fn (Builder $query) => $query->where('effective_from', '<=', today()->toDateString()),
        );
    }

    public function currentPrice(): ?MaterialPrice
    {
        return $this->effectivePrice()->first();
    }

    protected function casts(): array
    {
        return ['type' => MaterialType::class, 'unit' => MaterialUnit::class, 'is_active' => 'boolean'];
    }
}
