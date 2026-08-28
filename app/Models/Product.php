<?php

namespace App\Models;

use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $code
 * @property string|null $model
 * @property string $name
 * @property string|null $image_path
 * @property string|null $notes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['code', 'model', 'name', 'image_path', 'notes'])]
class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory;

    /**
     * Get the size variants for the product.
     *
     * @return HasMany<ProductVariant, $this>
     */
    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->orderBy('sort_order');
    }

    /**
     * Get all stock offers for the product.
     *
     * @return HasMany<StockOffer, $this>
     */
    public function offers(): HasMany
    {
        return $this->hasMany(StockOffer::class);
    }

    /**
     * Get the latest active stock offer for the product.
     *
     * @return HasOne<StockOffer, $this>
     */
    public function latestOffer(): HasOne
    {
        return $this->hasOne(StockOffer::class)
            ->where('is_active', true)
            ->latestOfMany();
    }
}
