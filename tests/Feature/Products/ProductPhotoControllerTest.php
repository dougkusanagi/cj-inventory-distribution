<?php

use App\Enums\StockOfferType;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Storage::fake('public');
});

test('marketing lists products and filters those without photos', function () {
    $withPhoto = Product::factory()->create(['name' => 'Calça com foto']);
    $withPhoto->addMedia(UploadedFile::fake()->image('capa.jpg'))
        ->toMediaCollection(Product::MEDIA_COLLECTION);
    Product::factory()->create(['name' => 'Calça sem foto']);

    $this->actingAs(User::factory()->marketing()->create())
        ->get(route('product-photos.index', ['image' => 'without']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('product-photos/index')
            ->has('products.data', 1)
            ->where('products.data.0.name', 'Calça sem foto')
            ->where('withoutPhotosCount', 1)
            ->missing('products.data.0.stock_volumes'),
        );
});

test('marketing adds, removes and reorders photos without changing product data', function () {
    $product = Product::factory()->create(['name' => 'Jaqueta', 'is_active' => false]);
    $product->update(['stock_offer_type' => StockOfferType::Replenishment]);
    $product->stockVolumes()->create(['total_quantity' => 6]);
    $kept = $product->addMedia(UploadedFile::fake()->image('mantida.jpg'))
        ->toMediaCollection(Product::MEDIA_COLLECTION);
    $removed = $product->addMedia(UploadedFile::fake()->image('removida.jpg'))
        ->toMediaCollection(Product::MEDIA_COLLECTION);

    $this->actingAs(User::factory()->marketing()->create())
        ->from(route('product-photos.index'))
        ->put(route('product-photos.update', $product), [
            'images' => [UploadedFile::fake()->image('nova.jpg', 800, 1000)],
            'image_order' => ['new:0', 'media:'.$kept->id],
            'remove_media_ids' => [$removed->id],
        ])
        ->assertRedirect(route('product-photos.index'))
        ->assertSessionHasNoErrors();

    $photos = $product->fresh()->getMedia(Product::MEDIA_COLLECTION);

    expect($photos)->toHaveCount(2)
        ->and($photos->last()->id)->toBe($kept->id)
        ->and($photos->first()->file_name)->toEndWith('.webp')
        ->and($product->fresh()->is_active)->toBeFalse()
        ->and($product->fresh()->name)->toBe('Jaqueta')
        ->and($product->stockVolumes()->sum('total_quantity'))->toBe(6);
    $this->assertModelMissing($removed);
});

test('photo updates keep the five photo limit and reject photos from other products', function () {
    $product = Product::factory()->create();
    foreach (range(1, 5) as $index) {
        $product->addMedia(UploadedFile::fake()->image("foto-{$index}.jpg"))
            ->toMediaCollection(Product::MEDIA_COLLECTION);
    }
    $foreign = Product::factory()->create()
        ->addMedia(UploadedFile::fake()->image('outra.jpg'))
        ->toMediaCollection(Product::MEDIA_COLLECTION);
    $user = User::factory()->marketing()->create();

    $this->actingAs($user)
        ->put(route('product-photos.update', $product), [
            'images' => [UploadedFile::fake()->image('sexta.jpg')],
        ])
        ->assertSessionHasErrors(['images' => 'Um produto pode ter no máximo 5 fotos.']);

    $this->actingAs($user)
        ->put(route('product-photos.update', $product), [
            'remove_media_ids' => [$foreign->id],
        ])
        ->assertSessionHasErrors(['remove_media_ids' => 'Só é possível remover imagens deste produto.']);

    expect($product->fresh()->getMedia(Product::MEDIA_COLLECTION))->toHaveCount(5);
    $this->assertModelExists($foreign);
});

test('stock users cannot open the photo screen', function () {
    $product = Product::factory()->create();
    $user = User::factory()->stock()->create();

    $this->actingAs($user)->get(route('product-photos.index'))->assertForbidden();
    $this->actingAs($user)
        ->put(route('product-photos.update', $product), [
            'images' => [UploadedFile::fake()->image('nova.jpg')],
        ])
        ->assertForbidden();
});
