<?php

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Store;
use App\Models\User;

it('registers and deactivates a store from the drawer', function (int $width): void {
    $this->actingAs(User::factory()->stock()->create());
    $outlet = Store::factory()->create(['name' => str_repeat('DistribuiçãoCentral', 6)]);
    $shipment = Order::factory()->for($outlet)->create(['status' => OrderStatus::Completed]);
    $legacy = Order::factory()->create(['status' => OrderStatus::Completed]);
    OrderItem::factory()->for($shipment)->create(['total_quantity' => 36]);
    OrderItem::factory()->for($legacy)->create(['total_quantity' => 4]);

    $page = visit(route('stores.index', [], false))->resize($width, 844)
        ->assertSee('Lojas')
        ->assertSee('36 peças em pedidos finalizados')
        ->assertSee('4 peças em pedidos finalizados sem loja vinculada.')
        ->assertScript('document.documentElement.scrollWidth <= window.innerWidth')
        ->click('Nova loja')
        ->assertSee('Cadastrar loja')
        ->fill('#store-directory-name', '  Loja São Paulo  ')
        ->screenshot(filename: "lojas-editor-{$width}")
        ->click('Salvar loja')
        ->assertMissing('[role="dialog"]')
        ->assertSee('Loja São Paulo');

    $store = Store::query()->where('name', 'Loja São Paulo')->sole();
    expect($store->is_active)->toBeTrue();

    $page->click('[aria-label="Editar loja Loja São Paulo"]')
        ->assertSee('Editar loja')
        ->click('#store-directory-active')
        ->click('Salvar loja')
        ->assertMissing('[role="dialog"]')
        ->assertSeeIn('main li:has-text("Loja São Paulo")', 'Inativa')
        ->assertScript('document.documentElement.scrollWidth <= window.innerWidth')
        ->screenshot(filename: "lojas-{$width}")
        ->assertNoJavaScriptErrors();

    expect($store->fresh()->is_active)->toBeFalse();
})->with([390, 768, 1366]);
