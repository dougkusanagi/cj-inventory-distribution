<?php

use App\Models\Product;
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
