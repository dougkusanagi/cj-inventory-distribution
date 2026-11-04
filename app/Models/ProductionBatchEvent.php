<?php

namespace App\Models;

use App\Enums\ProductionStage;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use LogicException;

/**
 * @property int $id
 * @property int $production_batch_id
 * @property ProductionStage|null $from_stage
 * @property ProductionStage $to_stage
 * @property int $quantity
 * @property int $actor_id
 * @property string|null $notes
 * @property Carbon $occurred_at
 * @property int|null $from_workshop_id
 * @property int|null $to_workshop_id
 * @property string|null $from_workshop_name
 * @property string|null $to_workshop_name
 * @property string|null $kind
 */
#[Fillable(['production_batch_id', 'from_stage', 'to_stage', 'quantity', 'actor_id', 'notes', 'occurred_at', 'from_workshop_id', 'to_workshop_id', 'from_workshop_name', 'to_workshop_name', 'kind'])]
class ProductionBatchEvent extends Model
{
    public $timestamps = false;

    protected static function booted(): void
    {
        static::updating(fn (): never => throw new LogicException('Eventos de produção são imutáveis.'));
        static::deleting(fn (): never => throw new LogicException('Eventos de produção não podem ser apagados.'));
    }

    /** @return BelongsTo<ProductionBatch, $this> */
    public function batch(): BelongsTo
    {
        return $this->belongsTo(ProductionBatch::class, 'production_batch_id')->withTrashed();
    }

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id')->withTrashed();
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'from_stage' => ProductionStage::class,
            'to_stage' => ProductionStage::class,
            'occurred_at' => 'datetime',
            'quantity' => 'integer',
        ];
    }
}
