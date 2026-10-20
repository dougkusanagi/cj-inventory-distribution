<?php

namespace App\Models;

use App\Concerns\RestoresStockSafely;
use App\Enums\ProductLine;
use App\Enums\StockOfferType;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
 * @property int|null $wash_type_id
 * @property int|null $category_id
 * @property ProductLine|null $line
 * @property string|null $notes
 * @property bool $is_active
 * @property StockOfferType $stock_offer_type
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['code', 'model', 'name', 'category_id', 'wash_type_id', 'line', 'stock_offer_type', 'notes', 'is_active'])]
class Product extends Model implements HasMedia
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory, RestoresStockSafely;

    use InteractsWithMedia;

    protected static function booted(): void
    {
        static::deleting(function (self $product): void {
            $children = $product->stockVolumes()->get();
            $product->forceFill(['deleted_child_ids' => $children->modelKeys()])->saveQuietly();
            $children->each->delete();
        });

        static::restored(function (self $product): void {
            $product->stockVolumes()->withTrashed()->whereIn('id', $product->deleted_child_ids ?? [])->get()
                ->filter(fn (StockOfferVolume $volume): bool => $volume->trashed())
                ->each->restore();
        });
    }

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

    public const MAX_IMAGE_INPUT_DIMENSION = 4096;

    public const MAX_IMAGE_UPLOAD_SIZE_KB = self::MAX_IMAGE_UPLOAD_SIZE_MB * 1024;

    /**
     * The model's default attribute values.
     *
     * @var array<string, bool|string>
     */
    protected $attributes = [
        'is_active' => true,
        'stock_offer_type' => 'new_grade',
    ];

    /** @return BelongsTo<WashType, $this> */
    public function washType(): BelongsTo
    {
        return $this->belongsTo(WashType::class);
    }

    /**
     * Get the category assigned to the product.
     *
     * @return BelongsTo<Category, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Get the physical sacks of the product.
     *
     * @return HasMany<StockOfferVolume, $this>
     */
    public function stockVolumes(): HasMany
    {
        return $this->hasMany(StockOfferVolume::class)
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    /** @param Builder<Product> $query */
    public function scopeWithStockSummary(Builder $query): void
    {
        $query->withSum('stockVolumes as recorded_quantity', 'total_quantity')
            ->withCount('stockVolumes as recorded_volume_count');
    }

    /**
     * Limit products to the stock that can be shown in the shared catalog.
     *
     * @param  Builder<Product>  $query
     */
    public function scopeAvailableForCatalog(Builder $query): void
    {
        $query
            ->where('is_active', true)
            ->where('stock_offer_type', '!=', StockOfferType::NewGrade->value)
            ->whereHas('stockVolumes', function (Builder $query): void {
                $query->where('total_quantity', '>', 0)
                    ->whereNull('current_order_id')
                    ->whereNull('consumed_at');
            });
    }

    /**
     * Get the model's attribute casts.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'line' => ProductLine::class,
            'stock_offer_type' => StockOfferType::class,
            'deleted_child_ids' => 'array',
        ];
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
