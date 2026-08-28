<?php

namespace App\Actions\Products;

use Illuminate\Http\UploadedFile;
use RuntimeException;

class StoreProductImage
{
    /**
     * Store a validated product image with a generated filename.
     */
    public function handle(UploadedFile $image): string
    {
        $path = $image->store('products', 'public');

        if (! is_string($path)) {
            throw new RuntimeException('Não foi possível armazenar a foto do produto.');
        }

        return $path;
    }
}
