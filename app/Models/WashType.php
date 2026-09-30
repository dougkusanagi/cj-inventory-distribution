<?php

namespace App\Models;

use Database\Factories\WashTypeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'slug', 'is_active'])]
class WashType extends Model
{
    /** @use HasFactory<WashTypeFactory> */
    use HasFactory, SoftDeletes;

    /** @return array<int, array{id: int, name: string, is_active: bool}> */
    public static function options(?int $includeId = null): array
    {
        return static::query()
            ->where(function (Builder $query) use ($includeId): void {
                $query->where('is_active', true);
                if ($includeId !== null) {
                    $query->orWhereKey($includeId);
                }
            })
            ->orderBy('name')
            ->get(['id', 'name', 'is_active'])
            ->toArray();
    }

    /** @return HasMany<Product, $this> */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /**
     * Get the model's attribute casts.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }
}
