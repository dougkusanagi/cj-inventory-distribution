<?php

namespace App\Actions\Products;

use App\Models\Product;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Image;
use Illuminate\Support\Str;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class StoreProductImage
{
    /**
     * Store a canonical WebP product image with a generated filename.
     */
    public function handle(Product $product, UploadedFile $image, int $order): Media
    {
        $contents = Image::fromUpload($image)
            ->orient()
            ->scale(Product::MAX_IMAGE_WIDTH, Product::MAX_IMAGE_HEIGHT)
            ->toWebp()
            ->quality(Product::IMAGE_WEBP_QUALITY)
            ->toBytes();

        return $product->addMediaFromString($contents)
            ->usingFileName(Str::uuid().'.webp')
            ->setOrder($order)
            ->toMediaCollection(Product::MEDIA_COLLECTION);
    }
}
