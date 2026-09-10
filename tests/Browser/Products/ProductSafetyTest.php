<?php

use App\Enums\StockOfferType;
use App\Models\Product;
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
        ->wait(1)
        ->type('#product-name', '   ')
        ->click('#product-tab-stock')
        ->click('#has-stock-offer');

    $page->script('window.scrollTo(0, document.body.scrollHeight);');
    $page->submit()->wait(1);

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

it('keeps a second sack when its removal is cancelled', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create(['name' => 'Produto com dois sacos E2E']);
    $offer = $product->offers()->create([
        'type' => StockOfferType::NewGrade,
        'is_active' => true,
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

    $page = visit(route('products.edit', [$product->id], false))
        ->wait(1)
        ->click('#product-tab-stock')
        ->assertSee('Saco 1')
        ->assertSee('Saco 2')
        ->assertValue('#volume-total-1', '3');

    $page->script('window.confirm = () => false;');

    $page
        ->click('#product-tab-stock')
        ->click('button[aria-label="Mais ações para o Saco 2"]')
        ->assertSee('Duplicar saco')
        ->assertSee('Remover saco');

    $page->script("Array.from(document.querySelectorAll('[role=menuitem]')).find((element) => element.textContent?.includes('Remover saco'))?.click();");

    $page
        ->assertSee('Saco 2')
        ->assertValue('#volume-total-1', '3')
        ->assertNoJavaScriptErrors();

    expect($offer->stockVolumes()->count())->toBe(2);
});

it('opens the stock tab when saving from the details tab returns stock errors', function () {
    $this->actingAs(User::factory()->create());

    $page = visit(route('products.create', [], false))
        ->type('#product-name', 'Produto com estoque incompleto')
        ->click('#product-tab-stock')
        ->click('#has-stock-offer')
        ->click('#product-tab-details');

    $page->submit()->wait(1);

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
        ->wait(1)
        ->type('#product-name', 'Produto ainda não salvo');

    $page->script('window.confirm = () => false;');

    $page
        ->click('Produtos')
        ->wait(0.5)
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
        ->wait(1)
        ->assertSee($product->name);

    $page
        ->click('button[aria-label="Excluir Produto removível E2E"]')
        ->assertSee('Excluir produto?')
        ->assertSee('suas fotos, tamanhos e estoque serão removidos permanentemente.');

    $page
        ->press('Cancelar')
        ->assertDontSee('Excluir produto?')
        ->assertSee($product->name);

    $page
        ->click('button[aria-label="Excluir Produto removível E2E"]')
        ->press('Excluir produto')
        ->wait(1)
        ->assertRoute('products.index')
        ->assertDontSee($product->name)
        ->assertSee('Produto excluído.')
        ->assertNoJavaScriptErrors();

    expect(Product::query()->whereKey($product->id)->exists())->toBeFalse();
});
