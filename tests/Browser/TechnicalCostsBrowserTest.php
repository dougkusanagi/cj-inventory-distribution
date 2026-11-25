<?php

use App\Models\CostItem;
use App\Models\Material;
use App\Models\User;

it('registers an effective material price using the monetary input', function (int $width) {
    $material = Material::factory()->create(['name' => 'Sarja crua', 'code' => 'INS-999999']);
    $this->actingAs(User::factory()->admin()->create());

    visit(route('materials.index', [], false))
        ->resize($width, 900)
        ->click('a[aria-label="Preços de Sarja crua"]')
        ->type('#unit-price', '123456')
        ->click('Registrar preço')
        ->assertSee('Vigente')
        ->assertScript('document.documentElement.scrollWidth <= window.innerWidth')
        ->assertNoJavaScriptErrors()
        ->screenshot(filename: "precos-insumo-{$width}");

    expect($material->currentPrice()?->unit_price)->toBe('12.3456');
})->with([390, 768, 1366]);

it('registers a cost with the bank-style mask and percentage surcharge', function (int $width) {
    $this->actingAs(User::factory()->admin()->create());

    visit(route('cost-items.index', [], false))
        ->resize($width, 900)
        ->click('Novo custo-base')
        ->fill('#cost-name', 'Mão de obra')
        ->type('#cost-amount', '820')
        ->click('#cost-surcharge-type')
        ->click('[role="option"]:has-text("Porcentagem")')
        ->fill('#cost-surcharge', '10')
        ->screenshot(filename: "custo-base-formulario-{$width}")
        ->click('Salvar custo-base')
        ->assertMissing('[data-slot="drawer-content"]')
        ->assertSee('Mão de obra')
        ->assertSee('10%')
        ->assertScript('document.documentElement.scrollWidth <= window.innerWidth')
        ->assertNoJavaScriptErrors()
        ->screenshot(filename: "custos-base-{$width}");

    expect(CostItem::query()->sole())->default_amount->toBe('8.20')->surcharge_value->toBe('10.00');
})->with([390, 768, 1366]);
