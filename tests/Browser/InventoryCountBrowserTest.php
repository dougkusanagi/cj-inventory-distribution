<?php

use App\Enums\StockOfferType;
use App\Models\InventoryCount;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Vite;

beforeEach(function (): void {
    config(['inertia.ssr.enabled' => false]);
    Vite::useHotFile(storage_path('framework/testing-hot-file'));
});

it('guides the user from selecting a sack to saving its count', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create(['name' => 'Calça para conferir']);
    $offer = $product->offers()->create(['type' => StockOfferType::Replenishment]);
    $volume = $offer->stockVolumes()->create(['total_quantity' => 10]);
    $size = $volume->items()->create([
        'size' => 'M',
        'sort_order' => 0,
        'is_active' => true,
        'quantity' => 10,
    ]);

    $this->actingAs($user);

    $page = visit(route('inventory.index', [], false))
        ->assertSee('Nova contagem')
        ->assertSee('Calça para conferir')
        ->click('button[aria-label="Selecionar SC-'.str_pad((string) $volume->id, 6, '0', STR_PAD_LEFT).'"]')
        ->assertVisible('[data-testid="inventory-selection"]')
        ->assertSee('1 saco selecionado')
        ->type('#inventory-reason', 'Conferência guiada')
        ->press('Começar a contar');

    $page->assertSee('Conte o que está no saco');

    $count = InventoryCount::query()->sole();
    $countItem = $count->items()->sole();

    $page
        ->assertRoute('inventory.show', [$count->id])
        ->assertSee('0 de 1 sacos contados')
        ->assertSee('Conte o que está no saco')
        ->clear("#count-{$countItem->id}-0")
        ->fill("#count-{$countItem->id}-0", '8')
        ->press('Salvar e continuar')
        ->assertSee('Contagem concluída')
        ->assertSee('Diferença total: -2 peças')
        ->assertEnabled('Confirmar balanço')
        ->assertNoJavaScriptErrors();

    expect($size->fresh()->quantity)->toBe(10)
        ->and($countItem->fresh()->counted_total)->toBe(8);
});
