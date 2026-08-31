<?php

namespace App\Models;

use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;
use Spatie\Image\Enums\Fit;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * @property int $id
 * @property string $code
 * @property string|null $model
 * @property string $name
 * @property string|null $notes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['code', 'model', 'name', 'notes'])]
class Product extends Model implements HasMedia
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory;

    use InteractsWithMedia;

    public const MEDIA_COLLECTION = 'product-images';

    public const MAX_IMAGES = 5;

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

    /**
     * Get the latest stock offer that is available in the shared catalog.
     *
     * @return HasOne<StockOffer, $this>
     */
    public function latestAvailableOffer(): HasOne
    {
        return $this->hasOne(StockOffer::class)
            ->availableForCatalog()
            ->latestOfMany();
    }

    /**
     * Register the product image collection.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection(self::MEDIA_COLLECTION)
            ->useDisk('public')
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp']);
    }

    /**
     * Register the thumbnail used by product lists.
     */
    public function registerMediaConversions(?Media $media = null): void
    {
        $this->addMediaConversion('thumb')
            ->nonQueued()
            ->fit(Fit::Crop, 480, 600)
            ->format('webp')
            ->quality(82);
    }
}
