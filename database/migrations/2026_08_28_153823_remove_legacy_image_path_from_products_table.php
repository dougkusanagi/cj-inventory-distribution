<?php

use App\Models\Product;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->dropColumn('image_path');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->string('image_path')->nullable();
        });

        foreach (Product::query()->with('media')->cursor() as $product) {
            $media = $product->getFirstMedia(Product::MEDIA_COLLECTION);

            if ($media === null) {
                continue;
            }

            $path = $media->getPathRelativeToRoot();

            if (Storage::disk($media->disk)->exists($path)) {
                $product->forceFill(['image_path' => $path])->saveQuietly();
            }
        }
    }
};
