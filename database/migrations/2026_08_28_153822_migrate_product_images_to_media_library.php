<?php

use App\Models\Product;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    public function up(): void
    {
        foreach (Product::query()->whereNotNull('image_path')->cursor() as $product) {
            $imagePath = $product->getAttribute('image_path');

            if (! is_string($imagePath) || ! Storage::disk('public')->exists($imagePath)) {
                continue;
            }

            $product->addMediaFromDisk($imagePath, 'public')
                ->preservingOriginal()
                ->toMediaCollection(Product::MEDIA_COLLECTION);
        }
    }

    public function down(): void
    {
        // The legacy path is restored by the following schema migration.
    }
};
