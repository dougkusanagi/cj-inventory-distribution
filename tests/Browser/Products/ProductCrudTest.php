<?php

use App\Enums\StockOfferType;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Vite;

beforeEach(function (): void {
    config(['inertia.ssr.enabled' => false]);
    Vite::useHotFile(storage_path('framework/testing-hot-file'));
});

it('redirects a guest away from the product creation form', function () {
    visit(route('products.create', [], false))
        ->wait(1)
        ->assertRoute('login')
        ->assertSee('Entrar')
        ->assertNoJavaScriptErrors();
});

it('renders the product creation form for an authenticated user', function () {
    $user = User::factory()->create();

    $this->actingAs($user);

    visit(route('products.create', [], false))
        ->wait(1)
        ->assertRoute('products.create')
        ->assertSee('Cadastrar produto')
        ->assertPresent('#product-name')
        ->assertPresent('#has-stock-offer')
        ->assertAttribute('#has-stock-offer', 'aria-checked', 'false')
        ->assertNoJavaScriptErrors();
});

it('creates a product without a stock offer from the form', function () {
    $user = User::factory()->create();

    $this->actingAs($user);

    $page = visit(route('products.create', [], false))
        ->wait(1)
        ->type('#product-name', 'Blusa básica E2E')
        ->type('#product-model', 'MOD-E2E-001')
        ->type('#product-notes', 'Produto criado pelo fluxo principal.');

    $page->submit()->wait(1);

    $page
        ->assertRoute('products.index')
        ->assertSee('Blusa básica E2E')
        ->assertSee('CJ-000001')
        ->assertSee('Sem oferta')
        ->assertSee('Produto cadastrado.')
        ->assertNoJavaScriptErrors();

    $product = Product::query()->with('latestOffer')->sole();

    $this->assertModelExists($product);
    expect($product->code)->toBe('CJ-000001');
    expect($product->model)->toBe('MOD-E2E-001');
    expect($product->notes)->toBe('Produto criado pelo fluxo principal.');
    expect($product->latestOffer)->toBeNull();
});

it('keeps a stock quantity when disabling a size is cancelled', function () {
    $user = User::factory()->create();

    $this->actingAs($user);

    $page = visit(route('products.create', [], false))
        ->wait(1)
        ->type('#product-name', 'Blusa com grade E2E')
        ->click('#has-stock-offer')
        ->click('#stock-size-preset-letters')
        ->click('#volume-0-active-2')
        ->type('#volume-0-quantity-2', '7')
        ->assertAttribute('#has-stock-offer', 'aria-checked', 'true')
        ->assertAttribute('#stock-size-preset-letters', 'aria-checked', 'true')
        ->assertAttribute('#volume-0-active-2', 'aria-checked', 'true')
        ->assertValue('#volume-0-quantity-2', '7')
        ->assertValue('#volume-total-0', '7')
        ->assertAttribute('#volume-total-0', 'aria-readonly', 'true')
        ->assertDisabled('button[aria-label="Remover Saco 1"]');

    $page->script('window.confirm = () => false;');

    $page
        ->click('#volume-0-active-2')
        ->assertAttribute('#volume-0-active-2', 'aria-checked', 'true')
        ->assertValue('#volume-0-quantity-2', '7');

    $page->submit()->wait(1);

    $page
        ->assertRoute('products.index')
        ->assertSee('Blusa com grade E2E')
        ->assertSee('Disponível para distribuição')
        ->assertSee('7')
        ->assertSee('1 saco')
        ->assertSee('Produto cadastrado.')
        ->assertNoJavaScriptErrors();

    $product = Product::query()->with('latestOffer.stockVolumes.items')->sole();

    $this->assertModelExists($product);
    expect($product->latestOffer)->not->toBeNull();
    expect($product->latestOffer->type)->toBe(StockOfferType::NewGrade);
    expect($product->latestOffer->calculatedTotalQuantity())->toBe(7);
    expect($product->latestOffer->stockVolumes)->toHaveCount(1);

    $medium = $product->latestOffer->stockVolumes->sole()->items->firstWhere('size', 'M');

    expect($medium)->not->toBeNull();
    expect($medium->is_active)->toBeTrue();
    expect($medium->quantity)->toBe(7);
});

it('edits a product, preserves its code, and adds a stock sack', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create([
        'name' => 'Produto antigo E2E',
        'model' => 'MODELO-ANTIGO',
    ]);
    $originalCode = $product->code;
    $offer = $product->offers()->create([
        'type' => StockOfferType::NewGrade,
        'is_active' => true,
    ]);
    $volume = $offer->stockVolumes()->create([
        'sort_order' => 0,
        'total_quantity' => 4,
    ]);
    $volume->items()->createMany([
        ['size' => 'PP', 'sort_order' => 0, 'is_active' => false, 'quantity' => null],
        ['size' => 'P', 'sort_order' => 1, 'is_active' => false, 'quantity' => null],
        ['size' => 'M', 'sort_order' => 2, 'is_active' => true, 'quantity' => 4],
        ['size' => 'G', 'sort_order' => 3, 'is_active' => false, 'quantity' => null],
        ['size' => 'GG', 'sort_order' => 4, 'is_active' => false, 'quantity' => null],
    ]);

    $this->actingAs($user);

    $page = visit(route('products.edit', [$product->id], false))
        ->wait(1)
        ->assertRoute('products.edit', [$product->id])
        ->assertValue('#product-name', 'Produto antigo E2E')
        ->assertValue('#product-model', 'MODELO-ANTIGO')
        ->assertSee($product->code)
        ->assertAttribute('#has-stock-offer', 'aria-checked', 'true')
        ->assertValue('#volume-0-quantity-2', '4');

    $page->script('window.confirm = () => false;');

    $page
        ->press('Encerrar estoque')
        ->assertAttribute('#has-stock-offer', 'aria-checked', 'true')
        ->assertValue('#volume-0-quantity-2', '4')
        ->type('#product-name', 'Produto atualizado E2E')
        ->click('#stock-offer-type-broken_grade')
        ->press('Adicionar saco')
        ->assertSee('Saco 2')
        ->type('#volume-total-1', '3');

    $page->script('window.scrollTo(0, document.body.scrollHeight);');
    $page->wait(0.2);

    $page
        ->submit()
        ->wait(1);

    $page
        ->assertRoute('products.index')
        ->assertSee('Produto atualizado E2E')
        ->assertSee('7')
        ->assertSee('2 sacos')
        ->assertSee('Produto atualizado.')
        ->assertNoJavaScriptErrors();

    $product->refresh()->load('latestOffer.stockVolumes.items');

    expect($product->code)->toBe($originalCode);
    expect($product->name)->toBe('Produto atualizado E2E');
    expect($product->latestOffer)->not->toBeNull();
    expect($product->latestOffer->type)->toBe(StockOfferType::BrokenGrade);
    expect($product->latestOffer->calculatedTotalQuantity())->toBe(7);
    expect($product->latestOffer->stockVolumes->pluck('total_quantity')->all())->toBe([4, 3]);
});

it('rejects an invalid image without adding it to the form', function () {
    $user = User::factory()->create();

    $this->actingAs($user);

    visit(route('products.create', [], false))
        ->wait(1)
        ->attach('#product-images-gallery', base_path('README.md'))
        ->assertSee('README.md: use JPG, PNG ou WebP.')
        ->assertSee('0/5')
        ->assertNotPresent('Cortar e usar foto')
        ->assertNoJavaScriptErrors();

    expect(Product::query()->count())->toBe(0);
});

it('crops a gallery image before adding it to the product form', function () {
    $user = User::factory()->create();

    $this->actingAs($user);

    visit(route('products.create', [], false))
        ->wait(1)
        ->type('#product-name', 'Produto com foto E2E')
        ->attach('#product-images-gallery', base_path('public/apple-touch-icon.png'))
        ->assertEnabled('Cortar e usar foto')
        ->press('Cortar e usar foto')
        ->assertSee('1/5')
        ->assertSee('Capa')
        ->assertNoJavaScriptErrors();

    expect(Product::query()->count())->toBe(0);
});

it('keeps the product form usable on a narrow mobile viewport', function () {
    $user = User::factory()->create();

    $this->actingAs($user);

    visit(route('products.create', [], false))
        ->wait(1)
        ->resize(390, 844)
        ->assertRoute('products.create')
        ->assertPresent('#product-name')
        ->assertPresent('button[type="submit"]')
        ->assertScript('document.documentElement.scrollWidth <= window.innerWidth')
        ->assertNoJavaScriptErrors();
});
