<?php

namespace App\Actions\Products;

use App\Models\Product;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class StoreProductImage
{
    /**
     * Store a validated product image with a generated filename.
     */
    public function handle(Product $product, UploadedFile $image, int $order): Media
    {
        return $product->addMedia($image)
            ->usingFileName(Str::uuid().'.'.$image->extension())
            ->setOrder($order)
            ->toMediaCollection(Product::MEDIA_COLLECTION);
    }
}
