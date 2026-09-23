<?php

namespace Database\Seeders;

use App\Enums\ProductLine;
use App\Enums\StockOfferType;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FullSizeCatalogDemoSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $product = DB::transaction(function (): Product {
            $category = Category::query()->where('slug', 'calca')->firstOrFail();

            $product = Product::query()->firstOrCreate(
                ['code' => 'DEMO-CJ-0009'],
                [
                    'model' => '3446',
                    'name' => 'Calça Jeans 34 a 46',
                    'category_id' => $category->getKey(),
                    'line' => ProductLine::Slim,
                    'notes' => 'Produto de demonstração com grade completa para comparação dos cartões.',
                    'is_active' => true,
                ],
            );

            $offer = $product->offers()->firstOrCreate(
                ['type' => StockOfferType::Replenishment],
                ['notes' => 'Oferta de demonstração com tamanhos de 34 a 46.'],
            );

            $volume = $offer->stockVolumes()->firstOrCreate(
                ['sort_order' => 0],
                ['total_quantity' => 14],
            );

            foreach (['34', '36', '38', '40', '42', '44', '46'] as $sortOrder => $size) {
                $volume->items()->firstOrCreate(
                    ['size' => $size],
                    [
                        'sort_order' => $sortOrder,
                        'is_active' => true,
                        'quantity' => 2,
                    ],
                );
            }

            return $product;
        });

        if ($product->getMedia(Product::MEDIA_COLLECTION)->isEmpty()) {
            $product
                ->addMedia(public_path('images/products/calca-reta.png'))
                ->preservingOriginal()
                ->toMediaCollection(Product::MEDIA_COLLECTION);
        }
    }
}
