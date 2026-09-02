<?php

namespace App\Models;

use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
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
 * @property-read StockOffer|null $latestOffer
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

    public const MAX_IMAGE_WIDTH = 1600;

    public const MAX_IMAGE_HEIGHT = 2000;

    public const IMAGE_WEBP_QUALITY = 84;

    /**
     * Protect the upload endpoint from files that are too large to process.
     * The browser optimizes the image before upload and the server stores
     * a normalized WebP version.
     */
    public const MAX_IMAGE_UPLOAD_SIZE_MB = 25;

    public const MAX_IMAGE_UPLOAD_SIZE_KB = self::MAX_IMAGE_UPLOAD_SIZE_MB * 1024;

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
     * Get the latest stock offer for the product, including hidden offers.
     *
     * @return HasOne<StockOffer, $this>
     */
    public function latestOffer(): HasOne
    {
        return $this->hasOne(StockOffer::class)
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
            ->ofMany(['id' => 'MAX'], function (Builder $query): void {
                StockOffer::applyAvailableForCatalog($query);
            });
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
