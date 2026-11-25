<?php

use App\Enums\TechnicalMaterialRole;
use App\Enums\TechnicalSheetStatus;
use App\Enums\UserRole;
use App\Models\Material;
use App\Models\MaterialPrice;
use App\Models\Product;
use App\Models\TechnicalSheet;
use App\Models\TechnicalSheetMaterial;
use App\Models\User;

it('lets modeling prepare a revision and send it for review', function (int $width) {
    $product = Product::factory()->create(['name' => 'Calça reta com reforço na costura lateral']);
    Material::factory()->create(['name' => 'Sarja crua', 'code' => 'INS-999999']);
    $this->actingAs(User::factory()->create(['role' => UserRole::Modeling]));

    visit(route('technical-sheets.index', [], false))
        ->resize($width, 900)
        ->click('Ver fichas')
        ->click('Criar ficha técnica')
        ->assertSee('Revisão 1')
        ->click('Editar dados técnicos')
        ->fill('#sheet-instructions', 'Reforçar a costura lateral.')
        ->click('Adicionar insumo')
        ->click('#technical-material-0')
        ->click('[role="option"]:has-text("Sarja crua")')
        ->fill('#technical-quantity-0', '1,25')
        ->screenshot(filename: "ficha-editor-{$width}")
        ->click('Salvar dados técnicos')
        ->assertMissing('[data-slot="drawer-content"]')
        ->assertSee('Reforçar a costura lateral.')
        ->assertSee('Sarja crua')
        ->click('Enviar para revisão')
        ->click('[data-slot="drawer-content"] button[type="submit"]')
        ->assertMissing('[data-slot="drawer-content"]')
        ->assertSee('Em revisão')
        ->assertDontSee('Editar custos')
        ->assertScript('document.documentElement.scrollWidth <= window.innerWidth')
        ->assertNoJavaScriptErrors()
        ->screenshot(filename: "ficha-em-revisao-{$width}");

    expect(TechnicalSheet::query()->where('product_id', $product->id)->sole()->materials()->sole()->quantity)
        ->toBe('1.250');
})->with([390, 768, 1366]);

it('lets an administrator record a sale price and approve the revision', function (int $width) {
    $this->actingAs(User::factory()->admin()->create());
    $material = Material::factory()->create();
    MaterialPrice::factory()->create(['material_id' => $material->id, 'unit_price' => '12.5000']);
    $product = Product::factory()->create(['name' => 'Calça reta em sarja azul']);
    $sheet = TechnicalSheet::factory()->create([
        'status' => TechnicalSheetStatus::InReview,
        'product_id' => $product->id,
        'instructions' => 'Reforçar a costura lateral e revisar a posição da etiqueta antes de liberar o lote.',
    ]);
    TechnicalSheetMaterial::factory()->create([
        'technical_sheet_id' => $sheet->id, 'material_id' => $material->id,
        'role' => TechnicalMaterialRole::FabricOption, 'quantity' => '1.500',
    ]);

    visit(route('technical-sheets.show', $sheet, false))
        ->resize($width, 900)
        ->click('Editar custos')
        ->type('#sheet-sale-0', '4000')
        ->screenshot(filename: "ficha-custos-{$width}")
        ->click('Salvar custos')
        ->assertMissing('[data-slot="drawer-content"]')
        ->assertSee('Custo total')
        ->click('Aprovar revisão')
        ->click('[data-slot="drawer-content"] button[type="submit"]')
        ->assertMissing('[data-slot="drawer-content"]')
        ->assertSee('Aprovada')
        ->assertScript('document.documentElement.scrollWidth <= window.innerWidth')
        ->assertNoJavaScriptErrors()
        ->screenshot(filename: "ficha-aprovada-{$width}");

    expect($sheet->fresh()->status)->toBe(TechnicalSheetStatus::Approved)
        ->and($sheet->materials()->sole()->sale_price)->toBe('40.00');
})->with([390, 1366]);
