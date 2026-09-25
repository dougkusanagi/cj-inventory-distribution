<?php

use App\Enums\StockOfferType;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\StockOfferVolume;
use App\Models\User;
use Illuminate\Support\Facades\Vite;

beforeEach(function (): void {
    config(['inertia.ssr.enabled' => false]);
    Vite::useHotFile(storage_path('framework/testing-hot-file'));
});

it('shows validation feedback and does not save an invalid stock offer', function () {
    $user = User::factory()->create();

    $this->actingAs($user);

    $page = visit(route('products.create', [], false))
        ->type('#product-name', '   ')
        ->click('#product-tab-stock')
        ->press('Adicionar saco');

    $page->script('window.scrollTo(0, document.body.scrollHeight);');
    $page->submit();

    $page
        ->assertRoute('products.create')
        ->assertAttribute('#product-tab-details', 'aria-selected', 'true')
        ->assertSee('Não foi possível salvar o produto.')
        ->assertSee('Informe o nome do produto.')
        ->assertSee('Informe o total do saco quando nenhuma quantidade por tamanho for conhecida.')
        ->assertAttribute('#product-name', 'aria-invalid', 'true')
        ->assertAttribute('#volume-total-0', 'aria-invalid', 'true')
        ->assertNoJavaScriptErrors();

    expect(Product::query()->count())->toBe(0);
});

it('keeps existing sacks read only in the product form', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create(['name' => 'Produto com dois sacos E2E']);
    $offer = $product->offers()->create([
        'type' => StockOfferType::NewGrade,
    ]);

    foreach ([4, 3] as $sortOrder => $totalQuantity) {
        $volume = $offer->stockVolumes()->create([
            'sort_order' => $sortOrder,
            'total_quantity' => $totalQuantity,
        ]);

        $volume->items()->create([
            'size' => 'M',
            'sort_order' => 0,
            'is_active' => false,
            'quantity' => null,
        ]);
    }

    $this->actingAs($user);

    visit(route('products.edit', [$product->id], false))
        ->click('#product-tab-stock')
        ->assertSee('Saco 1')
        ->assertSee('Saco 2')
        ->assertSee('4 peças · Disponível')
        ->assertSee('3 peças · Disponível')
        ->assertSee('Registrar entrada')
        ->assertSee('Registrar saída')
        ->assertDontSee('Duplicar saco')
        ->assertDontSee('Remover saco')
        ->assertNoJavaScriptErrors();

    expect($offer->stockVolumes()->count())->toBe(2);
});

it('opens product stock entry in a dialog or drawer with grade cards', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create(['name' => 'Produto para entrada rápida']);

    $this->actingAs($user);

    $page = visit(route('products.edit', [$product->id], false))
        ->click('#product-tab-stock')
        ->click('[data-testid="open-stock-entry"]')
        ->assertPresent('[data-testid="stock-entry-dialog"]')
        ->assertPresent('[data-testid="stock-entry-form"]')
        ->assertPresent('[data-testid="entry-stock-offer-type-selector"]')
        ->assertPresent('#entry-stock-offer-type-new_grade')
        ->press('Cancelar')
        ->assertMissing('[data-testid="stock-entry-dialog"]')
        ->resize(390, 844)
        ->click('[data-testid="open-stock-entry"]')
        ->assertVisible('[data-slot="drawer-content"]')
        ->assertPresent('[data-testid="stock-entry-drawer"]')
        ->assertPresent('[data-testid="entry-stock-offer-type-selector"]')
        ->assertNoJavaScriptErrors();
});

it('registers stock from the product dialog and returns to the product', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create(['name' => 'Produto lançado pelo modal']);

    $this->actingAs($user);

    $page = visit(route('products.edit', [$product->id], false))
        ->click('#product-tab-stock')
        ->click('[data-testid="open-stock-entry"]')
        ->press('Adicionar saco')
        ->type('#volume-total-0', '8')
        ->click('#entry-reason')
        ->click('[role="option"]:has-text("Recebimento da fábrica")')
        ->click('[data-testid="stock-entry-form"] button[type="submit"]')
        ->assertRoute('products.edit', [$product->id])
        ->assertSee('8 peças · Disponível')
        ->assertSee('Entrada de estoque registrada.')
        ->assertNoJavaScriptErrors();

    expect(StockMovement::query()->count())->toBe(1)
        ->and(StockOfferVolume::query()->count())->toBe(1);
});

it('uses the grade cards on the standalone stock entry form', function () {
    $this->actingAs(User::factory()->create());

    visit(route('stock-entries.create', [], false))
        ->assertPresent('[data-testid="entry-stock-offer-type-selector"]')
        ->assertPresent('#entry-stock-offer-type-broken_grade')
        ->assertMissing('#entry-type')
        ->assertNoJavaScriptErrors();
});

it('opens the stock tab when saving from the details tab returns stock errors', function () {
    $this->actingAs(User::factory()->create());

    $page = visit(route('products.create', [], false))
        ->type('#product-name', 'Produto com estoque incompleto')
        ->click('#product-tab-stock')
        ->press('Adicionar saco')
        ->click('#product-tab-details');

    $page->submit();

    $page
        ->assertAttribute('#product-tab-stock', 'aria-selected', 'true')
        ->assertVisible('#volume-total-0')
        ->assertSee('Informe o total do saco quando nenhuma quantidade por tamanho for conhecida.')
        ->assertScript('document.activeElement.id === "volume-total-0"')
        ->assertNoJavaScriptErrors();

    expect(Product::query()->count())->toBe(0);
});

it('opens the details tab for native validation when saving from stock', function () {
    $this->actingAs(User::factory()->create());

    $page = visit(route('products.create', [], false))
        ->click('#product-tab-stock')
        ->press('Adicionar saco')
        ->type('#volume-total-0', '12');

    $page->submit();

    $page
        ->assertAttribute('#product-tab-details', 'aria-selected', 'true')
        ->assertVisible('#product-name')
        ->assertScript('document.activeElement.id === "product-name"')
        ->click('#product-tab-stock')
        ->assertValue('#volume-total-0', '12')
        ->assertNoJavaScriptErrors();

    expect(Product::query()->count())->toBe(0);
});

it('prevents leaving a product form with unsaved changes when navigation is cancelled', function () {
    $user = User::factory()->create();

    $this->actingAs($user);

    $page = visit(route('products.create', [], false))
        ->type('#product-name', 'Produto ainda não salvo');

    $page->script('window.confirm = () => false;');

    $page
        ->click('Produtos')
        ->assertRoute('products.create')
        ->assertValue('#product-name', 'Produto ainda não salvo')
        ->assertNoJavaScriptErrors();

    expect(Product::query()->count())->toBe(0);
});

it('requires confirmation before deleting a product and allows cancellation', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create(['name' => 'Produto removível E2E']);

    $this->actingAs($user);

    $page = visit(route('products.index', [], false))
        ->assertSee($product->name);

    $page
        ->click('button[aria-label="Excluir Produto removível E2E"]')
        ->assertSee('Excluir produto?')
        ->assertSee('será movido para a lixeira, junto com suas fotos, tamanhos e estoque.');

    $page
        ->press('Cancelar')
        ->assertDontSee('Excluir produto?')
        ->assertSee($product->name);

    $page
        ->click('button[aria-label="Excluir Produto removível E2E"]')
        ->press('Excluir produto')
        ->assertRoute('products.index')
        ->assertDontSee($product->name)
        ->assertSee('Produto excluído.')
        ->assertNoJavaScriptErrors();

    $this->assertSoftDeleted('products', ['id' => $product->id]);
});

it('explains why a product with available stock cannot be moved to the trash', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create(['name' => 'Produto com estoque ativo E2E']);
    $offer = $product->offers()->create(['type' => StockOfferType::Replenishment]);
    $offer->stockVolumes()->create(['total_quantity' => 5]);

    $this->actingAs($user);

    visit(route('products.index', [], false))
        ->click('button[aria-label="Excluir Produto com estoque ativo E2E"]')
        ->press('Excluir produto')
        ->assertSee('Produto com estoque disponível ou reservado não pode ser excluído.')
        ->assertPresent('[data-sonner-toast][data-type="error"]')
        ->assertSee($product->name)
        ->assertNoJavaScriptErrors();

    expect($product->refresh()->trashed())->toBeFalse();
});
