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
        ->click('#stock-offer-type-broken_grade')
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
    $product->update(['stock_offer_type' => StockOfferType::NewGrade]);

    foreach ([4, 3] as $sortOrder => $totalQuantity) {
        $volume = $product->stockVolumes()->create([
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
        ->assertSee('4 peças')
        ->assertSee('Disponível')
        ->assertSee('3 peças')
        ->assertSee('Disponível')
        ->assertSee('Entrada')
        ->assertSee('Saída')
        ->assertDontSee('Duplicar saco')
        ->assertMissing('button:text-is("Remover saco")')
        ->assertMissing('#volume-total-0')
        ->click('[data-testid="stock-more-actions"]')
        ->assertSee('Excluir sacos')
        ->assertNoJavaScriptErrors();

    expect($product->stockVolumes()->count())->toBe(2);
});

it('opens product stock entry in a dialog or drawer with the product grade', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create(['name' => 'Produto para entrada rápida']);

    $this->actingAs($user);

    $page = visit(route('products.edit', [$product->id], false))
        ->click('#product-tab-stock')
        ->click('[data-testid="open-stock-entry"]')
        ->assertPresent('[data-testid="stock-entry-dialog"]')
        ->assertPresent('[data-testid="stock-entry-form"]')
        ->assertSeeIn('[data-testid="entry-stock-offer-type"]', 'Grade Nova')
        ->click('[data-testid="stock-entry-form"] button:has-text("Cancelar")')
        ->assertMissing('[data-testid="stock-entry-dialog"]')
        ->resize(390, 844)
        ->click('[data-testid="open-stock-entry"]')
        ->assertVisible('[data-slot="drawer-content"]')
        ->assertPresent('[data-testid="stock-entry-drawer"]')
        ->assertPresent('[data-testid="entry-stock-offer-type"]')
        ->assertNoJavaScriptErrors();
});

it('registers stock from the product dialog and returns to the product', function () {
    $user = User::factory()->create();
    $product = Product::factory()->replenishment()->create(['name' => 'Produto lançado pelo modal']);

    $this->actingAs($user);

    $page = visit(route('products.edit', [$product->id], false))
        ->click('#product-tab-stock')
        ->click('[data-testid="open-stock-entry"]')
        ->assertMissing('#entry-reason')
        ->assertMissing('#volume-total-0')
        ->type('#entry-stock-totals-bag-count', '2')
        ->type('#entry-stock-totals-piece-count', '15')
        ->assertSee('15 peças em 2 sacos')
        ->click('[data-testid="stock-entry-form"] button[type="submit"]')
        ->assertRoute('products.edit', [$product->id])
        ->assertSee('8 peças')
        ->assertSee('Disponível')
        ->assertSee('7 peças')
        ->assertSee('Disponível')
        ->assertSee('Entrada de estoque registrada.')
        ->assertNoJavaScriptErrors();

    expect(StockMovement::query()->count())->toBe(1)
        ->and(StockMovement::query()->sole()->reason)->toBe('Entrada de Reposição')
        ->and(StockOfferVolume::query()->count())->toBe(2);
});

it('asks for the reason and sizes only for grade furada products', function () {
    $user = User::factory()->create();
    $brokenGrade = Product::factory()->brokenGrade()->create(['name' => 'Produto com grade furada']);
    $replenishment = Product::factory()->replenishment()->create(['name' => 'Produto de reposição']);

    $this->actingAs($user);

    visit(route('products.edit', [$brokenGrade->id], false))
        ->click('#product-tab-stock')
        ->click('[data-testid="open-stock-entry"]')
        ->assertSeeIn('[data-testid="entry-stock-offer-type"]', 'Grade Furada')
        ->assertPresent('#entry-reason')
        ->press('Adicionar saco')
        ->assertPresent('#volume-0-active-0')
        ->assertNoJavaScriptErrors();

    visit(route('products.edit', [$replenishment->id], false))
        ->click('#product-tab-stock')
        ->click('[data-testid="open-stock-entry"]')
        ->assertSeeIn('[data-testid="entry-stock-offer-type"]', 'Reposição')
        ->assertMissing('#entry-reason')
        ->assertPresent('#entry-stock-totals-bag-count')
        ->assertNoJavaScriptErrors();
});

it('shows the selected product grade on the standalone stock entry form', function () {
    $product = Product::factory()->brokenGrade()->create(['name' => 'Produto avulso de grade furada']);
    $this->actingAs(User::factory()->create());

    visit(route('stock-entries.create', ['product' => $product->id], false))
        ->assertSeeIn('[data-testid="entry-stock-offer-type"]', 'Grade Furada')
        ->assertPresent('#entry-reason')
        ->assertMissing('[data-testid="entry-stock-offer-type-selector"]')
        ->assertNoJavaScriptErrors();
});

it('opens the stock tab when saving from the details tab returns stock errors', function () {
    $this->actingAs(User::factory()->create());

    $page = visit(route('products.create', [], false))
        ->type('#product-name', 'Produto com estoque incompleto')
        ->click('#product-tab-stock')
        ->click('#stock-offer-type-broken_grade')
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
        ->click('#stock-offer-type-broken_grade')
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
    $product->update(['stock_offer_type' => StockOfferType::Replenishment]);
    $product->stockVolumes()->create(['total_quantity' => 5]);

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

it('confirms deletion from the edit form even when the form has unsaved changes', function () {
    $product = Product::factory()->create(['name' => 'Produto excluído pela edição']);
    $this->actingAs(User::factory()->create());

    $page = visit(route('products.edit', [$product->id], false))
        ->type('#product-name', 'Alteração ainda não salva')
        ->click('button[aria-label="Excluir produto"]')
        ->assertSee('Excluir produto?')
        ->click('[role="dialog"] button:has-text("Cancelar")')
        ->assertNotPresent('[role="dialog"]')
        ->assertValue('#product-name', 'Alteração ainda não salva');

    $this->assertModelExists($product);
    $page->script('window.confirm = () => false;');

    $page
        ->click('button[aria-label="Excluir produto"]')
        ->click('[role="dialog"] button:has-text("Excluir produto")')
        ->assertRoute('products.index')
        ->assertSee('Produto excluído.')
        ->assertDontSee($product->name)
        ->assertNoJavaScriptErrors();

    $this->assertSoftDeleted('products', ['id' => $product->id]);
});

it('keeps a product with physical stock when deletion starts from the edit form', function () {
    $product = Product::factory()->create(['name' => 'Produto protegido na edição']);
    $product->update(['stock_offer_type' => StockOfferType::Replenishment]);
    $volume = $product->stockVolumes()->create(['total_quantity' => 4]);
    $this->actingAs(User::factory()->create());

    visit(route('products.edit', [$product->id], false))
        ->click('button[aria-label="Excluir produto"]')
        ->click('[role="dialog"] button:has-text("Excluir produto")')
        ->assertSee('Produto com estoque disponível ou reservado não pode ser excluído.')
        ->assertNoJavaScriptErrors();

    $this->assertNotSoftDeleted($product);
    $this->assertNotSoftDeleted($volume);
});
it('changes the product grade from the product form and records it', function (int $width, int $height) {
    $user = User::factory()->create();
    $product = Product::factory()->create(['name' => 'Produto Grade Nova para liberar', 'is_active' => true]);
    $product->stockVolumes()->create(['sort_order' => 0, 'total_quantity' => 9]);

    $this->actingAs($user);

    $page = visit(route('products.edit', [$product->id], false))
        ->resize($width, $height)
        ->click('#product-tab-stock')
        ->assertVisible('[data-testid="product-stock-type"]')
        ->assertSee('Grade Nova é só para uso interno')
        ->click('#product-stock-type-replenishment')
        ->assertSee('Ao salvar, o produto passa a aparecer no catálogo')
        ->assertScript('document.documentElement.scrollWidth <= window.innerWidth')
        ->screenshot(filename: "product-stock-type-{$width}");

    $page->submit();

    $page->assertRoute('products.index')->assertNoJavaScriptErrors();

    expect($product->refresh()->stock_offer_type)->toBe(StockOfferType::Replenishment);

    visit(route('stock-movements.index', ['product' => $product->id], false))
        ->resize($width, $height)
        ->assertSee('Reclassificação de grade')
        ->assertNoJavaScriptErrors();
})->with([
    'mobile' => [390, 844],
    'desktop' => [1280, 900],
]);
