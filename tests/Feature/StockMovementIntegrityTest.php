<?php

use App\Enums\StockOfferType;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\StockOfferVolume;
use App\Models\StockOfferVolumeItem;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Validation\ValidationException;

test('the database allows one active category slug and reuses a deleted slug', function () {
    $category = Category::factory()->create(['name' => 'Reposição', 'slug' => 'reposicao']);

    expect(fn () => Category::query()->create([
        'name' => 'Outra reposição',
        'slug' => 'reposicao',
        'is_active' => true,
    ]))->toThrow(QueryException::class);

    $category->delete();
    $replacement = Category::query()->create([
        'name' => 'Reposição nova',
        'slug' => 'reposicao',
        'is_active' => true,
    ]);

    expect($replacement->slug)->toBe('reposicao');
});

test('the database treats active sizes case-insensitively within one sack', function () {
    $volume = StockOfferVolume::factory()->withTotal(4)->create();
    StockOfferVolumeItem::factory()->for($volume, 'volume')->create(['size' => 'M']);

    expect(fn () => StockOfferVolumeItem::query()->create([
        'stock_offer_volume_id' => $volume->id,
        'size' => 'm',
        'sort_order' => 1,
        'is_active' => true,
        'quantity' => null,
    ]))->toThrow(QueryException::class);

    $volume->items()->firstOrFail()->delete();
    $replacement = $volume->items()->create([
        'size' => 'm',
        'sort_order' => 1,
        'is_active' => true,
        'quantity' => null,
    ]);

    expect($replacement->size)->toBe('m');
});

test('a deleted category cannot be assigned to a new product', function () {
    $user = User::factory()->create();
    $category = Category::factory()->create();
    $category->delete();

    $this->actingAs($user)
        ->post(route('products.store'), [
            'name' => 'Produto sem categoria removida',
            'category_id' => $category->id,
        ])
        ->assertInvalid(['category_id' => 'Selecione uma categoria válida.']);
});

test('a product with available stock cannot be moved to the trash', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();
    $offer = $product->offers()->create(['type' => StockOfferType::Replenishment]);
    $offer->stockVolumes()->create(['total_quantity' => 5]);

    $this->actingAs($user)
        ->delete(route('products.destroy', $product))
        ->assertInvalid(['product' => 'Produto com estoque disponível ou reservado não pode ser excluído. Registre uma saída ou zere os sacos pelo fluxo de estoque.']);

    expect($product->refresh()->deleted_at)->toBeNull();
});

test('restoring a product restores its soft-deleted stock tree without resurrecting a reservation', function () {
    $product = Product::factory()->create();
    $offer = $product->offers()->create(['type' => StockOfferType::NewGrade]);
    $volume = $offer->stockVolumes()->create(['total_quantity' => 0]);
    $item = $volume->items()->create(['size' => 'M', 'is_active' => false]);

    $product->delete();
    expect($product->fresh()->trashed())->toBeTrue();

    $product->restore();

    expect($product->fresh()->trashed())->toBeFalse()
        ->and($offer->fresh()->trashed())->toBeFalse()
        ->and($volume->fresh()->trashed())->toBeFalse()
        ->and($item->fresh()->trashed())->toBeFalse()
        ->and($volume->fresh()->current_order_id)->toBeNull();
});

test('the catalog tolerates a historically deleted category', function () {
    $category = Category::factory()->create(['name' => 'Categoria removida']);
    $product = Product::factory()->create(['category_id' => $category->id]);
    $offer = $product->offers()->create(['type' => StockOfferType::Replenishment]);
    $offer->stockVolumes()->create(['total_quantity' => 4]);
    $category->delete();

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('products.data.0.id', $product->id)
            ->where('products.data.0.category', 'Sem categoria'));
});

test('a pending order cannot be soft-deleted while it reserves a sack', function () {
    $product = Product::factory()->create();
    $offer = $product->offers()->create(['type' => StockOfferType::Replenishment]);
    $order = Order::factory()->create();
    $volume = $offer->stockVolumes()->create([
        'total_quantity' => 4,
        'current_order_id' => $order->id,
    ]);

    expect(fn () => $order->delete())
        ->toThrow(ValidationException::class);

    expect($order->fresh()->trashed())->toBeFalse()
        ->and($volume->fresh()->current_order_id)->toBe($order->id);
});
