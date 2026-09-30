<?php

namespace Database\Seeders;

use App\Enums\ProductLine;
use App\Enums\StockOfferType;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class EdgeCaseCatalogDemoSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seeds products that stress the catalog layout: long texts, missing
     * optional data, inactive products and many sacks or sizes.
     */
    public function run(): void
    {
        $longCategory = Category::query()->updateOrCreate(
            ['slug' => 'macacoes-e-jardineiras'],
            ['name' => 'Macacões, jardineiras e conjuntos premium', 'is_active' => true],
        );

        /**
         * @var list<array{
         *     code: string,
         *     model: string|null,
         *     name: string,
         *     category: Category|null,
         *     image: string|null,
         *     line: ProductLine|null,
         *     type: StockOfferType|null,
         *     is_active?: bool,
         *     sizes: list<string>,
         *     volumes: list<array{total: int, sizes: array<string, int|null>}>
         * }> $products
         */
        $products = [
            [
                'code' => 'DEMO-EX-0001',
                'model' => 'VERAO-2026-ALTO-BASICO-0042',
                'name' => 'Calça Jeans Wide Leg Cintura Alta com Elastano e Lavagem Stonewashed Premium',
                'category' => $longCategory,
                'image' => 'calca-wide-leg.png',
                'line' => ProductLine::Plus,
                'type' => StockOfferType::Replenishment,
                'sizes' => ['34', '36', '38', '40', '42', '44', '46'],
                'volumes' => [
                    ['total' => 14, 'sizes' => ['34' => 2, '36' => 2, '38' => 2, '40' => 2, '42' => 2, '44' => 2, '46' => 2]],
                    ['total' => 14, 'sizes' => ['34' => 2, '36' => 2, '38' => 2, '40' => 2, '42' => 2, '44' => 2, '46' => 2]],
                    ['total' => 21, 'sizes' => ['34' => 3, '36' => 3, '38' => 3, '40' => 3, '42' => 3, '44' => 3, '46' => 3]],
                    ['total' => 7, 'sizes' => ['34' => 1, '36' => 1, '38' => 1, '40' => 1, '42' => 1, '44' => 1, '46' => 1]],
                ],
            ],
            [
                'code' => 'DEMO-EX-0002',
                'model' => null,
                'name' => 'Jardineira',
                'category' => null,
                'image' => null,
                'line' => null,
                'type' => StockOfferType::BrokenGrade,
                'sizes' => ['PP', 'P', 'M', 'G', 'GG'],
                'volumes' => [
                    ['total' => 6, 'sizes' => ['P' => 2, 'M' => 2, 'G' => 2]],
                ],
            ],
            [
                'code' => 'DEMO-EX-0003',
                'model' => '7',
                'name' => 'Short inativo oculto do catálogo',
                'category' => $longCategory,
                'image' => 'short-mom.png',
                'line' => ProductLine::Slim,
                'type' => StockOfferType::Replenishment,
                'is_active' => false,
                'sizes' => ['36', '38', '40'],
                'volumes' => [
                    ['total' => 12, 'sizes' => ['36' => 4, '38' => 4, '40' => 4]],
                ],
            ],
            [
                'code' => 'DEMO-EX-0004',
                'model' => 'Sem oferta',
                'name' => 'Saia cadastrada sem oferta de estoque',
                'category' => $longCategory,
                'image' => 'saia-midi.png',
                'line' => ProductLine::Plus,
                'type' => null,
                'sizes' => [],
                'volumes' => [],
            ],
            [
                'code' => 'DEMO-EX-0005',
                'model' => '1234567890',
                'name' => 'Bermuda Ciclista Sem Costura Super Elástica Alongada',
                'category' => Category::query()->where('slug', 'bermuda')->first(),
                'image' => 'bermuda-ciclista.png',
                'line' => ProductLine::Slim,
                'type' => StockOfferType::NewGrade,
                'sizes' => ['PP', 'P', 'M', 'G', 'GG'],
                'volumes' => [
                    ['total' => 25, 'sizes' => ['PP' => 5, 'P' => 5, 'M' => 5, 'G' => 5, 'GG' => 5]],
                    ['total' => 10, 'sizes' => ['PP' => null, 'P' => null, 'M' => null, 'G' => null, 'GG' => null]],
                ],
            ],
        ];

        foreach ($products as $definition) {
            $product = Product::query()->updateOrCreate(
                ['code' => $definition['code']],
                [
                    'model' => $definition['model'],
                    'name' => $definition['name'],
                    'category_id' => $definition['category']?->getKey(),
                    'line' => $definition['line'],
                    'notes' => null,
                    'is_active' => $definition['is_active'] ?? true,
                ],
            );

            if ($definition['image'] !== null && $product->getMedia(Product::MEDIA_COLLECTION)->isEmpty()) {
                $product
                    ->addMedia(public_path('images/products/'.$definition['image']))
                    ->preservingOriginal()
                    ->toMediaCollection(Product::MEDIA_COLLECTION);
            }

            if ($definition['type'] === null) {
                continue;
            }

            $offer = $product->offers()->updateOrCreate(
                ['type' => $definition['type']],
                ['notes' => 'Oferta de demonstração para testar limites do layout.'],
            );

            foreach ($definition['volumes'] as $sortOrder => $volumeDefinition) {
                $volume = $offer->stockVolumes()->updateOrCreate(
                    ['sort_order' => $sortOrder],
                    ['total_quantity' => $volumeDefinition['total']],
                );

                $volume->items()->delete();

                foreach ($definition['sizes'] as $itemSortOrder => $size) {
                    $volume->items()->create([
                        'size' => $size,
                        'sort_order' => $itemSortOrder,
                        'is_active' => array_key_exists($size, $volumeDefinition['sizes']),
                        'quantity' => $volumeDefinition['sizes'][$size] ?? null,
                    ]);
                }
            }
        }
    }
}
