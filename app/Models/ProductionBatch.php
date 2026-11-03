<?php

namespace App\Models;

use App\Enums\ProductionStage;
use Database\Factories\ProductionBatchFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $code
 * @property int $product_id
 * @property int $quantity
 * @property ProductionStage $stage
 * @property Carbon $stage_entered_at
 * @property Carbon|null $completed_at
 * @property Carbon|null $received_at
 * @property int|null $received_by
 * @property int|null $workshop_id
 * @property-read Workshop|null $workshop
 * @property string|null $notes
 * @property int $version
 * @property int $created_by
 */
#[Fillable(['code', 'product_id', 'quantity', 'stage', 'stage_entered_at', 'completed_at', 'received_at', 'received_by', 'workshop_id', 'notes', 'version', 'created_by'])]
class ProductionBatch extends Model
{
    public const MAX_QUANTITY = 1000000;

    /** @use HasFactory<ProductionBatchFactory> */
    use HasFactory;

    use SoftDeletes;

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    /** @return BelongsTo<Workshop, $this> */
    public function workshop(): BelongsTo
    {
        return $this->belongsTo(Workshop::class)->withTrashed();
    }

    /** @return HasMany<ProductionBatchEvent, $this> */
    public function events(): HasMany
    {
        return $this->hasMany(ProductionBatchEvent::class)->orderBy('id');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'stage' => ProductionStage::class,
            'stage_entered_at' => 'datetime',
            'completed_at' => 'datetime',
            'received_at' => 'datetime',
            'quantity' => 'integer',
            'version' => 'integer',
        ];
    }
}
