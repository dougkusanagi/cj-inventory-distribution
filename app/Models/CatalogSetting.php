<?php

namespace App\Models;

use Database\Factories\CatalogSettingFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $whatsapp_number
 */
#[Fillable(['whatsapp_number'])]
class CatalogSetting extends Model
{
    /** @use HasFactory<CatalogSettingFactory> */
    use HasFactory;
}
