<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['status', 'reason', 'actor_id', 'confirmed_by', 'version', 'idempotency_key', 'payload_hash', 'confirmed_at'])]
class InventoryCount extends Model
{
    /** @return HasMany<InventoryCountItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(InventoryCountItem::class);
    }

    protected function casts(): array
    {
        return ['version' => 'integer', 'confirmed_at' => 'datetime'];
    }
}
