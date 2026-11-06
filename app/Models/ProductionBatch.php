<?php

namespace App\Models;

use App\Enums\ProductionStage;
use Database\Factories\ProductionBatchFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
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
 * @property int|null $parent_id
 * @property Carbon|null $split_at
 * @property-read Workshop|null $workshop
 * @property-read ProductionBatch|null $parent
 * @property string|null $notes
 * @property int $version
 * @property int $created_by
 */
#[Fillable(['code', 'product_id', 'quantity', 'stage', 'stage_entered_at', 'completed_at', 'received_at', 'received_by', 'workshop_id', 'parent_id', 'split_at', 'notes', 'version', 'created_by'])]
class ProductionBatch extends Model
{
    public const MAX_QUANTITY = 1000000;

    /**
     * A batch is stalled when it stays in the same stage for more than this many days.
     */
    public const STALLED_AFTER_DAYS = 5;

    /** @use HasFactory<ProductionBatchFactory> */
    use HasFactory;

    use SoftDeletes;

    /**
     * Batches that have been in an unfinished stage for more than the stalled limit.
     *
     * @param  Builder<ProductionBatch>  $query
     */
    public function scopeStalled(Builder $query): void
    {
        $query->where('stage', '!=', ProductionStage::Completed->value)
            ->where('stage_entered_at', '<', now()->subDays(self::STALLED_AFTER_DAYS));
    }

    public function isStalled(): bool
    {
        return $this->stage !== ProductionStage::Completed
            && $this->stage_entered_at->lt(now()->subDays(self::STALLED_AFTER_DAYS));
    }

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

    /** @return BelongsTo<ProductionBatch, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id')->withTrashed();
    }

    /** @return HasMany<ProductionBatchItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(ProductionBatchItem::class)->orderBy('sort_order')->orderBy('id');
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
            'split_at' => 'datetime',
            'quantity' => 'integer',
            'version' => 'integer',
        ];
    }
}
