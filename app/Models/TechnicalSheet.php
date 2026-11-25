<?php

namespace App\Models;

use App\Enums\TechnicalSheetStatus;
use Database\Factories\TechnicalSheetFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $product_id
 * @property int $revision
 * @property TechnicalSheetStatus $status
 * @property int $version
 * @property ?string $instructions
 * @property ?string $review_note
 * @property ?Carbon $approved_at
 * @property ?Carbon $obsoleted_at
 */
#[Fillable(['product_id', 'revision', 'status', 'version', 'instructions', 'review_note', 'created_by', 'approved_by', 'approved_at', 'obsoleted_by', 'obsoleted_at'])]
class TechnicalSheet extends Model
{
    /** @use HasFactory<TechnicalSheetFactory> */
    use HasFactory;

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    /** @return HasMany<TechnicalSheetMaterial, $this> */
    public function materials(): HasMany
    {
        return $this->hasMany(TechnicalSheetMaterial::class)->orderBy('sort_order');
    }

    /** @return HasMany<TechnicalSheetCost, $this> */
    public function costs(): HasMany
    {
        return $this->hasMany(TechnicalSheetCost::class)->orderBy('id');
    }

    public function isOpen(): bool
    {
        return in_array($this->status, [TechnicalSheetStatus::Draft, TechnicalSheetStatus::InReview], true);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['status' => TechnicalSheetStatus::class, 'approved_at' => 'datetime', 'obsoleted_at' => 'datetime'];
    }
}
