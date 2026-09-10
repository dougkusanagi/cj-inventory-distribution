<?php

use App\Enums\StockOfferType;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\UploadedFile;
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

it('shows the grade type, commercial line, and category in product cards and table', function () {
    $user = User::factory()->create();
    $category = Category::factory()->create(['name' => 'Calças']);
    $product = Product::factory()
        ->inCategory($category)
        ->slim()
        ->create(['name' => 'Produto classificado E2E']);
    $offer = $product->offers()->create([
        'type' => StockOfferType::BrokenGrade,
        'is_active' => true,
    ]);
    $offer->stockVolumes()->create(['total_quantity' => 3]);

    $this->actingAs($user);

    visit(route('products.index', [], false))
        ->wait(1)
        ->assertSee('Grade: Furada')
        ->assertSee('Slim')
        ->assertSee('Calças')
        ->click('button[aria-label="Visualização em cards"]')
        ->assertSee('Grade: Furada')
        ->assertSee('Slim')
        ->assertSee('Calças')
        ->assertNoJavaScriptErrors();
});

it('opens a product image gallery and changes the selected image', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create([
        'name' => 'Produto com galeria E2E',
    ]);
    $product->addMedia(UploadedFile::fake()->image('gallery-one.jpg', 800, 1000))
        ->toMediaCollection(Product::MEDIA_COLLECTION);
    $product->addMedia(UploadedFile::fake()->image('gallery-two.jpg', 800, 1000))
        ->toMediaCollection(Product::MEDIA_COLLECTION);

    $this->actingAs($user);

    $page = visit(route('products.index', [], false))
        ->resize(390, 844)
        ->assertSee('Produto com galeria E2E')
        ->assertPresent('[data-testid="abrir-galeria-produto-'.$product->id.'"]')
        ->click('[data-testid="abrir-galeria-produto-'.$product->id.'"]')
        ->assertPresent('[data-testid="galeria-produto-'.$product->id.'"]')
        ->assertPresent('#galeria-zoom-'.$product->id)
        ->assertValue('#galeria-zoom-'.$product->id, '1');

    $page->script('() => { const input = document.querySelector(\'#galeria-zoom-'.$product->id.'\'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, \'value\').set; setter.call(input, \'2\'); input.dispatchEvent(new Event(\'input\', { bubbles: true })); input.dispatchEvent(new Event(\'change\', { bubbles: true })); }');

    $page
        ->assertSee('1 de 2')
        ->assertSee('200%')
        ->click('button[aria-label="Próxima imagem de Produto com galeria E2E"]')
        ->assertSee('2 de 2')
        ->assertSee('100%')
        ->click('button[aria-label="Ver imagem 1 de Produto com galeria E2E"]')
        ->assertSee('1 de 2')
        ->click('[data-testid="galeria-produto-'.$product->id.'"] > button')
        ->click('button[aria-label="Visualização em cards"]')
        ->click('[data-testid="abrir-galeria-produto-'.$product->id.'"]')
        ->assertPresent('[data-testid="galeria-produto-'.$product->id.'"]')
        ->assertNoJavaScriptErrors();
});

it('requires confirmation before deleting a product', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create(['name' => 'Produto para excluir E2E']);

    $this->actingAs($user);

    visit(route('products.index', [], false))
        ->wait(1)
        ->click('button[aria-label="Excluir Produto para excluir E2E"]')
        ->assertSee('Excluir produto?')
        ->assertSee('Produto para excluir E2E')
        ->assertSee('Excluir produto')
        ->assertSee('Cancelar')
        ->assertNoJavaScriptErrors();

    $this->assertModelExists($product);
});

it('renders the product creation form for an authenticated user', function () {
    $user = User::factory()->create();

    $this->actingAs($user);

    visit(route('products.create', [], false))
        ->wait(1)
        ->assertRoute('products.create')
        ->assertSee('Cadastrar produto')
        ->assertPresent('#product-name')
        ->assertPresent('#product-cover')
        ->click('#product-tab-photos')
        ->assertSee('Fotos do produto')
        ->assertPresent('#has-stock-offer')
        ->click('#product-tab-stock')
        ->assertSee('Oferta de estoque ativa')
        ->assertDontSee('Mostrar oferta no catálogo')
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
        ->click('#product-tab-stock')
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
        ->assertPresent('button[aria-label="Mais ações para o Saco 1"]');

    $page->script('window.confirm = () => false;');

    $page
        ->click('#volume-0-active-2')
        ->assertAttribute('#volume-0-active-2', 'aria-checked', 'true')
        ->assertValue('#volume-0-quantity-2', '7');

    $page->submit()->wait(1);

    $page
        ->assertRoute('products.index')
        ->assertSee('Blusa com grade E2E')
        ->assertSee('Grade: Nova')
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
        ->click('#product-tab-stock')
        ->press('Encerrar estoque')
        ->assertAttribute('#has-stock-offer', 'aria-checked', 'true')
        ->assertValue('#volume-0-quantity-2', '4')
        ->click('#product-tab-details')
        ->type('#product-name', 'Produto atualizado E2E')
        ->click('#product-tab-stock')
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
        ->click('#product-tab-photos')
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
        ->click('#product-tab-stock')
        ->click('#product-tab-photos')
        ->assertSee('1/5')
        ->assertSee('Capa')
        ->click('#product-tab-details')
        ->assertPresent('#product-cover-image')
        ->assertNoJavaScriptErrors();

    expect(Product::query()->count())->toBe(0);
});

it('asks for confirmation before removing a product photo', function () {
    $user = User::factory()->create();

    $this->actingAs($user);

    visit(route('products.create', [], false))
        ->wait(1)
        ->click('#product-tab-photos')
        ->attach('#product-images-gallery', base_path('public/apple-touch-icon.png'))
        ->press('Cortar e usar foto')
        ->press('Remover')
        ->assertSee('Remover foto?')
        ->assertSee('A foto será descartada do formulário.')
        ->assertSee('Cancelar')
        ->assertSee('Remover foto')
        ->assertNoJavaScriptErrors();
});

it('keeps the product form usable on a narrow mobile viewport', function () {
    $user = User::factory()->create();

    $this->actingAs($user);

    visit(route('products.create', [], false))
        ->wait(1)
        ->resize(390, 844)
        ->assertRoute('products.create')
        ->assertPresent('#product-name')
        ->assertVisible('#product-tab-details')
        ->assertVisible('#product-tab-photos')
        ->assertVisible('#product-tab-stock')
        ->assertVisible('button[type="submit"]')
        ->assertScript("(() => { const modelInput = document.querySelector('#product-model'); const categoryLabel = document.querySelector('label[for=\"product-category\"]'); const categoryInput = document.querySelector('#product-category'); const lineLabel = [...document.querySelectorAll('legend')].find((element) => element.textContent?.trim() === 'Linha comercial'); const lineInput = document.querySelector('[aria-label=\"Linha comercial\"]'); if (!modelInput || !categoryLabel || !categoryInput || !lineLabel || !lineInput) { return false; } const closeTo = (value, expected) => Math.abs(value - expected) <= 1; return closeTo(categoryLabel.getBoundingClientRect().top - modelInput.getBoundingClientRect().bottom, 20) && closeTo(lineLabel.getBoundingClientRect().top - categoryInput.getBoundingClientRect().bottom, 20) && closeTo(categoryInput.getBoundingClientRect().top - categoryLabel.getBoundingClientRect().bottom, 8) && closeTo(lineInput.getBoundingClientRect().top - lineLabel.getBoundingClientRect().bottom, 8); })()")
        ->type('#product-name', 'Produto mobile')
        ->click('#product-tab-stock')
        ->assertSee('Tipo de Grade')
        ->assertSee('Nova')
        ->assertSee('Furada')
        ->assertScript("(() => { const cards = [...document.querySelectorAll('label[for^=\"stock-offer-type-\"]')]; return cards.length === 3 && new Set(cards.map((card) => Math.round(card.getBoundingClientRect().top))).size === 1; })()")
        ->assertScript("(() => { const cards = [...document.querySelectorAll('label[for^=\"stock-offer-type-\"]')]; return cards.every((card) => { const radio = card.querySelector('[role=\"radio\"]'); const content = card.querySelector('span.grid'); if (!radio || !content) { return false; } const cardRect = card.getBoundingClientRect(); const radioRect = radio.getBoundingClientRect(); const contentRect = content.getBoundingClientRect(); const paddingLeft = Number.parseFloat(getComputedStyle(card).paddingLeft); return Math.abs((radioRect.left + radioRect.width / 2) - (cardRect.left + cardRect.width / 2)) <= 1 && contentRect.top >= radioRect.bottom && Math.abs(contentRect.left - (cardRect.left + paddingLeft)) <= 1 && getComputedStyle(content).textAlign === 'left'; }); })()")
        ->type('#volume-total-0', '9')
        ->assertAttribute('#volume-total-0', 'type', 'number')
        ->assertScript("(() => { const up = document.querySelector('button[aria-label=\"Mover Saco 1 para cima\"]'); const down = document.querySelector('button[aria-label=\"Mover Saco 1 para baixo\"]'); const menu = document.querySelector('button[aria-label=\"Mais ações para o Saco 1\"]'); if (!up || !down || !menu) { return false; } return up.getBoundingClientRect().width > menu.getBoundingClientRect().width && down.getBoundingClientRect().width > menu.getBoundingClientRect().width; })()")
        ->assertScript('document.querySelector("#volume-total-0").closest("[data-slot=card]").parentElement.closest("[data-slot=card]") === null')
        ->assertScript('document.documentElement.scrollWidth <= window.innerWidth')
        ->click('#product-tab-details')
        ->assertValue('#product-name', 'Produto mobile')
        ->click('#product-tab-stock')
        ->assertValue('#volume-total-0', '9')
        ->assertScript('document.documentElement.scrollWidth <= window.innerWidth')
        ->assertNoJavaScriptErrors();
});
