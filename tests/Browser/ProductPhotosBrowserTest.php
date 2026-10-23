<?php

use App\Models\Product;
use App\Models\User;
use Illuminate\Http\UploadedFile;

test('marketing lands on the photo screen and manages photos from a drawer', function (int $width, int $height) {
    $product = Product::factory()->create(['name' => 'Calça Wide Leg Lavagem Escura Cintura Altíssima Com Bolsos Laterais']);
    $withPhotos = Product::factory()->create(['name' => 'Jaqueta com fotos']);
    foreach ([[800, 1000], [1200, 600]] as [$imageWidth, $imageHeight]) {
        $withPhotos->addMedia(UploadedFile::fake()->image('foto.jpg', $imageWidth, $imageHeight))
            ->toMediaCollection(Product::MEDIA_COLLECTION);
    }
    $this->actingAs(User::factory()->marketing()->create());

    $page = visit(route('dashboard', [], false))
        ->resize($width, $height)
        ->assertRoute('product-photos.index')
        ->assertSee('Fotos dos produtos')
        ->assertSee('2/5 fotos')
        ->assertDontSee('Pedidos')
        ->click('[data-testid="photo-product-'.$withPhotos->id.'"]')
        ->assertVisible('[data-testid="product-photos-drawer"]')
        ->assertDisabled('button:has-text("Salvar fotos")')
        ->click('[aria-label="Remover a foto 2"]')
        ->click('[role="dialog"] button:has-text("Remover foto")')
        ->assertSee('Alterações ainda não salvas.')
        ->click('button:has-text("Salvar fotos")')
        ->assertSee('Fotos de Jaqueta com fotos salvas.')
        ->assertSee('1/5 fotos')
        ->click('button:has-text("Ver 1 produto sem foto")')
        ->assertDontSee('Jaqueta com fotos')
        ->click('[data-testid="photo-product-'.$product->id.'"]')
        ->assertAttribute('#product-images-gallery', 'accept', 'image/*')
        ->assertAttribute('#product-images-camera', 'accept', 'image/*')
        ->attach('#product-images-gallery', base_path('public/apple-touch-icon.png'))
        ->press('Cortar e usar foto')
        ->assertSee('Alterações ainda não salvas.')
        ->assertEnabled('button:has-text("Salvar fotos")')
        ->assertScript('document.documentElement.scrollWidth <= window.innerWidth')
        ->assertNoJavaScriptErrors();

    expect($withPhotos->fresh()->getMedia(Product::MEDIA_COLLECTION))->toHaveCount(1);
})->with([
    'desktop' => [1280, 900],
    'mobile' => [390, 844],
]);

test('closing the photo drawer with unsaved changes asks before discarding', function () {
    $product = Product::factory()->create(['name' => 'Produto para descartar fotos']);
    $this->actingAs(User::factory()->marketing()->create());

    visit(route('product-photos.index', [], false))
        ->click('[data-testid="photo-product-'.$product->id.'"]')
        ->attach('#product-images-gallery', base_path('public/apple-touch-icon.png'))
        ->press('Cortar e usar foto')
        ->click('[data-testid="product-photos-drawer"] button:has-text("Cancelar")')
        ->assertSee('Descartar alterações?')
        ->click('[role="dialog"] button[data-variant="destructive"]')
        ->assertMissing('[data-testid="product-photos-drawer"]')
        ->assertNoJavaScriptErrors();

    expect($product->fresh()->getMedia(Product::MEDIA_COLLECTION))->toHaveCount(0);
});
