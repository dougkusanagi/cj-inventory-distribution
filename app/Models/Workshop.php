<?php

namespace App\Models;

use App\Enums\WorkshopType;
use Database\Factories\WorkshopFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property WorkshopType $type
 * @property bool $is_active
 */
#[Fillable(['name', 'slug', 'type', 'is_active'])]
class Workshop extends Model
{
    /** @use HasFactory<WorkshopFactory> */
    use HasFactory;

    use SoftDeletes;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['type' => WorkshopType::class, 'is_active' => 'boolean'];
    }
}
