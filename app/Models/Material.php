<?php

namespace App\Models;

use App\Enums\MaterialType;
use App\Enums\MaterialUnit;
use Database\Factories\MaterialFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
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

    public function currentPrice(): ?MaterialPrice
    {
        return $this->prices()
            ->where('effective_from', '<=', today()->toDateString())
            ->orderByDesc('effective_from')
            ->orderByDesc('id')
            ->first();
    }

    protected function casts(): array
    {
        return ['type' => MaterialType::class, 'unit' => MaterialUnit::class, 'is_active' => 'boolean'];
    }
}
