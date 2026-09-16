<?php

namespace Database\Seeders;

use App\Enums\ProductLine;
use App\Enums\StockOfferType;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockOffer;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CatalogDemoSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [];

        foreach ([
            'calca' => 'Calça',
            'bermuda' => 'Bermuda',
            'short' => 'Short',
            'cropped' => 'Cropped',
            'saia' => 'Saia',
            'blusa' => 'Blusa',
        ] as $slug => $name) {
            $categories[$slug] = Category::query()->updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $name,
                    'is_active' => true,
                ],
            );
        }

        /**
         * The seed uses whole sacks so the catalog preview can show realistic
         * totals while keeping the stock model's size quantities optional.
         *
         * @var list<array{
         *     code: string,
         *     model: string|null,
         *     name: string,
         *     category: string,
         *     image: string|null,
         *     additional_images?: list<string>,
         *     line: ProductLine,
         *     type: StockOfferType,
         *     size_preset: 'numeric-female'|'letters',
         *     volumes: list<array{total: int, sizes: array<string, int>}>
         * }> $products
         */
        $products = [
            [
                'code' => 'DEMO-CJ-0001',
                'model' => '2451',
                'name' => 'Calça Wide Leg',
                'category' => 'calca',
                'image' => 'calca-wide-leg.png',
                'additional_images' => ['calca-reta.png'],
                'line' => ProductLine::Slim,
                'type' => StockOfferType::Replenishment,
                'size_preset' => 'numeric-female',
                'volumes' => [
                    ['total' => 20, 'sizes' => ['34' => 4, '36' => 4, '38' => 4, '40' => 4, '42' => 4]],
                    ['total' => 18, 'sizes' => ['36' => 4, '38' => 5, '40' => 5, '42' => 4]],
                ],
            ],
            [
                'code' => 'DEMO-CJ-0002',
                'model' => '1820',
                'name' => 'Bermuda Jeans',
                'category' => 'bermuda',
                'image' => 'bermuda-jeans.png',
                'line' => ProductLine::Plus,
                'type' => StockOfferType::Replenishment,
                'size_preset' => 'numeric-female',
                'volumes' => [
                    ['total' => 16, 'sizes' => ['40' => 4, '42' => 4, '44' => 4, '46' => 4]],
                ],
            ],
            [
                'code' => 'DEMO-CJ-0003',
                'model' => '1938',
                'name' => 'Short Mom',
                'category' => 'short',
                'image' => 'short-mom.png',
                'line' => ProductLine::Slim,
                'type' => StockOfferType::BrokenGrade,
                'size_preset' => 'numeric-female',
                'volumes' => [
                    ['total' => 12, 'sizes' => ['36' => 4, '38' => 4, '40' => 4]],
                    ['total' => 10, 'sizes' => ['34' => 5, '38' => 5]],
                ],
            ],
            [
                'code' => 'DEMO-CJ-0004',
                'model' => null,
                'name' => 'Cropped Jeans',
                'category' => 'cropped',
                'image' => 'cropped-jeans.png',
                'line' => ProductLine::Plus,
                'type' => StockOfferType::BrokenGrade,
                'size_preset' => 'letters',
                'volumes' => [
                    ['total' => 15, 'sizes' => ['M' => 5, 'G' => 5, 'GG' => 5]],
                ],
            ],
            [
                'code' => 'DEMO-CJ-0005',
                'model' => '3107',
                'name' => 'Calça Reta',
                'category' => 'calca',
                'image' => 'calca-reta.png',
                'line' => ProductLine::Plus,
                'type' => StockOfferType::Replenishment,
                'size_preset' => 'numeric-female',
                'volumes' => [
                    ['total' => 18, 'sizes' => ['40' => 6, '42' => 6, '44' => 6]],
                    ['total' => 12, 'sizes' => ['42' => 4, '44' => 4, '46' => 4]],
                ],
            ],
            [
                'code' => 'DEMO-CJ-0006',
                'model' => '2040',
                'name' => 'Bermuda Ciclista',
                'category' => 'bermuda',
                'image' => 'bermuda-ciclista.png',
                'line' => ProductLine::Slim,
                'type' => StockOfferType::Replenishment,
                'size_preset' => 'letters',
                'volumes' => [
                    ['total' => 20, 'sizes' => ['P' => 5, 'M' => 5, 'G' => 5, 'GG' => 5]],
                ],
            ],
            [
                'code' => 'DEMO-CJ-0007',
                'model' => '2870',
                'name' => 'Saia Midi',
                'category' => 'saia',
                'image' => 'saia-midi.png',
                'line' => ProductLine::Plus,
                'type' => StockOfferType::BrokenGrade,
                'size_preset' => 'numeric-female',
                'volumes' => [
                    ['total' => 10, 'sizes' => ['36' => 3, '38' => 3, '40' => 4]],
                ],
            ],
            [
                'code' => 'DEMO-CJ-0008',
                'model' => '9999',
                'name' => 'Grade Nova Interna',
                'category' => 'blusa',
                'image' => 'produto-interno-grade-nova.png',
                'line' => ProductLine::Slim,
                'type' => StockOfferType::NewGrade,
                'size_preset' => 'letters',
                'volumes' => [
                    ['total' => 24, 'sizes' => ['P' => 6, 'M' => 6, 'G' => 6, 'GG' => 6]],
                ],
            ],
        ];

        $sizePresets = [
            'numeric-female' => ['34', '36', '38', '40', '42', '44', '46'],
            'letters' => ['PP', 'P', 'M', 'G', 'GG'],
        ];

        foreach ($products as $definition) {
            $product = Product::query()->updateOrCreate(
                ['code' => $definition['code']],
                [
                    'model' => $definition['model'],
                    'name' => $definition['name'],
                    'category_id' => $categories[$definition['category']]->getKey(),
                    'line' => $definition['line'],
                    'notes' => 'Produto de demonstração do catálogo.',
                    'is_active' => true,
                ],
            );

            $imageNames = array_filter([
                $definition['image'],
                ...($definition['additional_images'] ?? []),
            ]);

            foreach ($imageNames as $imageName) {
                if ($product->getMedia(Product::MEDIA_COLLECTION)->contains('file_name', $imageName)) {
                    continue;
                }

                $product
                    ->addMedia(public_path('images/products/'.$imageName))
                    ->preservingOriginal()
                    ->toMediaCollection(Product::MEDIA_COLLECTION);
            }

            $offer = $product->offers()->latest('id')->first() ?? new StockOffer;
            $offer->product()->associate($product);
            $offer->fill([
                'type' => $definition['type'],
                'notes' => 'Oferta de demonstração para testes.',
            ]);
            $offer->save();

            $sortOrders = [];
            foreach ($definition['volumes'] as $sortOrder => $volumeDefinition) {
                $sortOrders[] = $sortOrder;
                $volume = $offer->stockVolumes()->updateOrCreate(
                    ['sort_order' => $sortOrder],
                    ['total_quantity' => $volumeDefinition['total']],
                );

                $volume->items()->delete();
                $itemSortOrder = 0;
                foreach ($sizePresets[$definition['size_preset']] as $size) {
                    $volume->items()->create([
                        'size' => $size,
                        'sort_order' => $itemSortOrder,
                        'is_active' => array_key_exists($size, $volumeDefinition['sizes']),
                        'quantity' => $volumeDefinition['sizes'][$size] ?? null,
                    ]);
                    $itemSortOrder++;
                }
            }

            $offer->stockVolumes()->whereNotIn('sort_order', $sortOrders)->delete();
        }
    }
}
