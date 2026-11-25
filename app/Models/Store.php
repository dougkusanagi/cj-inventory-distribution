<?php

namespace App\Models;

use Database\Factories\StoreFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $name
 * @property string $name_key
 * @property bool $is_active
 */
#[Fillable(['name', 'is_active'])]
class Store extends Model
{
    /** @use HasFactory<StoreFactory> */
    use HasFactory, SoftDeletes;

    protected static function booted(): void
    {
        static::saving(function (self $store): void {
            $store->name = Str::squish($store->name);
            $store->name_key = self::nameKey($store->name);
        });
    }

    public static function nameKey(string $name): string
    {
        return Str::lower(Str::squish($name));
    }

    /** Consulta executada dentro da transação do pedido. */
    public static function activeIdForName(string $name): ?int
    {
        return self::query()
            ->where('is_active', true)
            ->where('name_key', self::nameKey($name))
            ->sharedLock()
            ->value('id');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }
}
