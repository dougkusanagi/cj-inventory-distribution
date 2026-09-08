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
        ->click('#has-stock-offer');

    $page->script('window.scrollTo(0, document.body.scrollHeight);');
    $page->submit()->wait(1);

    $page
        ->assertRoute('products.create')
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
        ->assertSee('Saco 1')
        ->assertSee('Saco 2')
        ->assertValue('#volume-total-1', '3');

    $page->script('window.confirm = () => false;');

    $page
        ->click('button[aria-label="Remover Saco 2"]')
        ->assertSee('Saco 2')
        ->assertValue('#volume-total-1', '3')
        ->assertNoJavaScriptErrors();

    expect($offer->stockVolumes()->count())->toBe(2);
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
