<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $user_id
 * @property string $stage
 */
#[Fillable(['user_id', 'stage'])]
class ProductionStageAssignment extends Model
{
    use SoftDeletes;

    protected $table = 'production_stage_user';

    public $timestamps = false;
}
