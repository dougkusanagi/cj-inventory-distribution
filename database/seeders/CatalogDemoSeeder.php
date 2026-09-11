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
                'volumes' => [
                    ['total' => 16, 'sizes' => ['44' => 4, '46' => 4, '48' => 4, '50' => 4]],
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
                'volumes' => [
                    ['total' => 15, 'sizes' => ['G' => 5, 'GG' => 5, '3G' => 5]],
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
                'volumes' => [
                    ['total' => 18, 'sizes' => ['44' => 6, '46' => 6, '48' => 6]],
                    ['total' => 12, 'sizes' => ['46' => 4, '48' => 4, '50' => 4]],
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
                'volumes' => [
                    ['total' => 24, 'sizes' => ['36' => 6, '38' => 6, '40' => 6, '42' => 6]],
                ],
            ],
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
                foreach ($volumeDefinition['sizes'] as $size => $quantity) {
                    $volume->items()->create([
                        'size' => $size,
                        'sort_order' => $itemSortOrder,
                        'is_active' => true,
                        'quantity' => $quantity,
                    ]);
                    $itemSortOrder++;
                }
            }

            $offer->stockVolumes()->whereNotIn('sort_order', $sortOrders)->delete();
        }
    }
}
