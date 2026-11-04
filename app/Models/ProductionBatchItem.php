<?php

namespace App\Models;

use Database\Factories\ProductionBatchItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $production_batch_id
 * @property string $size
 * @property int $quantity
 * @property int $sort_order
 */
#[Fillable(['production_batch_id', 'size', 'quantity', 'sort_order'])]
class ProductionBatchItem extends Model
{
    /** @use HasFactory<ProductionBatchItemFactory> */
    use HasFactory;

    use SoftDeletes;

    /** @return BelongsTo<ProductionBatch, $this> */
    public function batch(): BelongsTo
    {
        return $this->belongsTo(ProductionBatch::class, 'production_batch_id')->withTrashed();
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['quantity' => 'integer', 'sort_order' => 'integer'];
    }
}
