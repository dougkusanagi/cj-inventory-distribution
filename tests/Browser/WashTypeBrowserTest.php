<?php

use App\Enums\ProductLine;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockOffer;
use App\Models\StockOfferVolume;
use App\Models\User;
use App\Models\WashType;
use Illuminate\Support\Facades\Vite;

beforeEach(function (): void {
    config(['inertia.ssr.enabled' => false]);
    Vite::useHotFile(storage_path('framework/testing-hot-file'));
});

it('searches and quickly creates washes without losing the product form', function (int $width, int $height) {
    WashType::factory()->create(['name' => 'Stone', 'slug' => 'stone']);
    WashType::factory()->create(['name' => 'Acid', 'slug' => 'acid']);
    $this->actingAs(User::factory()->create());

    $page = visit(route('products.create', [], false))
        ->resize($width, $height)
        ->type('#product-name', 'Calça com lavagem')
        ->click('#product-wash-type')
        ->type('input[placeholder="Buscar tipo de lavagem"]', 'Stone')
        ->click('[cmdk-item]:has-text("Stone")')
        ->assertSee('Stone')
        ->click('button[aria-label="Cadastrar tipo de lavagem"]')
        ->resize($width, $height)
        ->type('#wash-type-name', 'Stone')
        ->press('Cadastrar lavagem')
        ->assertSee('Já existe um tipo de lavagem com esse nome.')
        ->clear('#wash-type-name')
        ->fill('#wash-type-name', 'Vintage')
        ->press('Cadastrar lavagem')
        ->assertSee('Tipo de lavagem cadastrado.')
        ->assertSee('Vintage')
        ->assertMissing('#wash-type-name')
        ->assertValue('#product-name', 'Calça com lavagem')
        ->assertRoute('products.create')
        ->assertScript('document.documentElement.scrollWidth <= document.documentElement.clientWidth')
        ->assertNoJavaScriptErrors();

    $page->click('button[type="submit"]:has-text("Cadastrar produto")')
        ->assertSee('Produto cadastrado.')
        ->assertRoute('products.index')
        ->assertSee('Calça com lavagem')
        ->assertNoJavaScriptErrors();

    $washType = WashType::query()->where('name', 'Vintage')->sole();
    expect(Product::query()->sole()->wash_type_id)->toBe($washType->id);
})->with(['desktop' => [1280, 900], 'mobile' => [390, 844]]);

it('searches public catalog washes, combines filters, and clears every selection', function (int $width, int $height) {
    $stone = WashType::factory()->create(['name' => 'Stone', 'slug' => 'stone']);
    $acid = WashType::factory()->create(['name' => 'Acid', 'slug' => 'acid']);
    $pants = Category::factory()->create(['name' => 'Calça', 'slug' => 'calca']);
    $shorts = Category::factory()->create(['name' => 'Short', 'slug' => 'short']);

    foreach ([
        ['name' => 'Calça Stone Plus', 'category_id' => $pants->id, 'wash_type_id' => $stone->id, 'line' => ProductLine::Plus],
        ['name' => 'Calça Stone Slim', 'category_id' => $pants->id, 'wash_type_id' => $stone->id, 'line' => ProductLine::Slim],
        ['name' => 'Short Stone Plus', 'category_id' => $shorts->id, 'wash_type_id' => $stone->id, 'line' => ProductLine::Plus],
        ['name' => 'Calça Acid Plus', 'category_id' => $pants->id, 'wash_type_id' => $acid->id, 'line' => ProductLine::Plus],
        ['name' => 'Calça sem lavagem', 'category_id' => $pants->id, 'wash_type_id' => null, 'line' => ProductLine::Plus],
    ] as $attributes) {
        $product = Product::factory()->create($attributes);
        $offer = StockOffer::factory()->replenishment()->for($product)->create();
        StockOfferVolume::factory()->for($offer)->withTotal(8)->create();
    }

    $page = visit(route('catalog', [], false))->resize($width, $height)
        ->assertCount('[data-testid="catalog-product"]', 5);

    if ($width < 768) {
        $page->click('button[aria-label="Abrir filtros de produtos"]');
    }
    $prefix = $width < 768 ? '#mobile-catalog-' : '#catalog-';
    $page->click($prefix.'wash_type')
        ->type('input[placeholder="Buscar tipo de lavagem"]', 'Sto')
        ->assertMissing('[cmdk-item]:has-text("Acid")')
        ->click('[cmdk-item]:has-text("Stone")')
        ->assertCount('[data-testid="catalog-product"]', 3)
        ->assertDontSee('Calça Acid Plus')
        ->assertDontSee('Calça sem lavagem')
        ->click($prefix.'category')
        ->click('[cmdk-item]:has-text("Calça")')
        ->assertCount('[data-testid="catalog-product"]', 2)
        ->assertDontSee('Short Stone Plus');

    if ($width < 768) {
        $page->click('label[for="mobile-catalog-line-plus"]');
    } else {
        $page->click('#catalog-line')->click('[role="option"]:has(:text-is("Plus"))');
    }

    $page->assertCount('[data-testid="catalog-product"]', 1);
    if ($width < 768) {
        $page->click('Ver 1 resultado')->assertSee('Calça Stone Plus')
            ->click('button[aria-label="Abrir filtros de produtos"]');
    } else {
        $page->assertSee('Calça Stone Plus');
    }
    $page->click($width < 768 ? '#catalog-filter-drawer button:has-text("Limpar filtros")' : 'Limpar filtros')
        ->assertSeeIn($prefix.'wash_type', 'Todas as lavagens')
        ->assertSeeIn($prefix.'category', 'Todas as categorias')
        ->assertCount('[data-testid="catalog-product"]', 5);

    if ($width < 768) {
        $page->assertAttribute('#mobile-catalog-line-all', 'data-state', 'checked')
            ->click('Ver 5 resultados');
    } else {
        $page->assertSeeIn('#catalog-line', 'Slim e Plus');
    }
    $page->assertSee('Calça Acid Plus')
        ->assertSee('Calça sem lavagem')
        ->assertSee('Calça Stone Slim')
        ->assertSee('Short Stone Plus')
        ->assertNoJavaScriptErrors();
})->with(['desktop' => [1280, 900], 'mobile' => [390, 844]]);

it('manages washes and filters products using the searchable selector', function (int $width, int $height) {
    $this->actingAs(User::factory()->create());
    $page = visit(route('wash-types.create', [], false))
        ->resize($width, $height)
        ->type('#wash-type-name', 'Stone')
        ->press('Salvar tipo de lavagem')
        ->assertRoute('wash-types.index')
        ->assertSee('Tipo de lavagem cadastrado.')
        ->click('a[aria-label="Editar Stone"]')
        ->fill('#wash-type-name', 'Stone claro')
        ->press('Salvar tipo de lavagem')
        ->assertRoute('wash-types.index')
        ->assertSee('Tipo de lavagem atualizado.');

    $washType = WashType::query()->sole();
    Product::factory()->create(['name' => 'Calça Stone', 'wash_type_id' => $washType->id]);
    Product::factory()->create(['name' => 'Calça sem lavagem']);

    $page->navigate(route('products.index', [], false));
    if ($width < 768) {
        $page->click('button[aria-label="Abrir filtros de produtos"]');
    }
    $page->click($width < 768 ? '#mobile-product-filter-wash_type' : '#product-filter-wash_type')
        ->type('input[placeholder="Buscar tipo de lavagem"]', 'claro')
        ->click('[cmdk-item]:has-text("Stone claro")')
        ->assertSee('Calça Stone')
        ->assertDontSee('Calça sem lavagem')
        ->click($width < 768 ? '[data-slot="drawer-content"] button[aria-label="Cadastrar tipo de lavagem"]' : 'button[aria-label="Cadastrar tipo de lavagem"]')
        ->type('#wash-type-name', 'Indigo')
        ->press('Cadastrar lavagem')
        ->assertSee('Tipo de lavagem cadastrado.')
        ->assertMissing('#wash-type-name')
        ->assertNoJavaScriptErrors();
    expect(WashType::query()->where('name', 'Indigo')->exists())->toBeTrue();
})->with(['desktop' => [1280, 900], 'mobile' => [390, 844]]);
