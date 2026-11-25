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

it('prints the selected sheet with only the data allowed in that mode', function (bool $admin, int $width) {
    $this->actingAs($admin
        ? User::factory()->admin()->create()
        : User::factory()->create(['role' => UserRole::Modeling]));
    $sheet = TechnicalSheet::factory()->create(['instructions' => 'Ajustar a barra.']);
    $material = Material::factory()->create(['name' => 'Sarja especial']);
    MaterialPrice::factory()->create(['material_id' => $material->id, 'unit_price' => '12.5000']);
    TechnicalSheetMaterial::factory()->create([
        'technical_sheet_id' => $sheet->id,
        'material_id' => $material->id,
        'role' => TechnicalMaterialRole::FabricOption,
        'material_name' => 'Sarja especial',
        'sale_price' => '40.00',
    ]);

    $page = visit(route('technical-sheets.show', $sheet, false))->resize($width, 900);
    $page->script(<<<'JS'
        () => {
            window.print = () => {
                const sheet = document.querySelector('.technical-sheet-print');
                window.printedSheet = sheet.textContent;
                window.printedControls = sheet.querySelectorAll('button, input, select, textarea').length;
                window.dispatchEvent(new Event('afterprint'));
            };
        }
        JS);

    $page->click('Imprimir ficha técnica')
        ->assertScript('window.printedSheet.includes("Sarja especial")')
        ->assertScript('window.printedSheet.includes("R$")', false)
        ->assertScript('window.printedControls', 0)
        ->assertScript('document.documentElement.scrollWidth <= window.innerWidth')
        ->click('Imprimir ficha em branco')
        ->assertScript('window.printedSheet.includes("Ficha técnica em branco")')
        ->assertScript('window.printedSheet.includes("Ajustar a barra.")', false)
        ->assertScript('window.printedSheet.includes("Sarja especial")', false)
        ->assertNoJavaScriptErrors()
        ->screenshot(filename: "ficha-opcoes-impressao-{$width}");

    if ($admin) {
        $page->click('Imprimir custos')
            ->assertScript('window.printedSheet.includes("Preço unitário")')
            ->assertScript('window.printedSheet.includes("40,00")')
            ->click('Editar custos')
            ->fill('#sheet-sale-0', '')
            ->type('#sheet-sale-0', '5200')
            ->click('[data-slot="drawer-content"] button:has-text("Imprimir custos")')
            ->assertScript('window.printedSheet.includes("52,00")')
            ->assertScript('window.printedSheet.includes("Alterações não salvas")');
    } else {
        $page->assertDontSee('Imprimir custos')
            ->click('Editar dados técnicos')
            ->fill('#sheet-instructions', 'Ajustar a barra e reforçar o bolso.')
            ->click('[data-slot="drawer-content"] button:has-text("Imprimir ficha técnica")')
            ->assertScript('window.printedSheet.includes("reforçar o bolso")')
            ->assertScript('window.printedSheet.includes("Alterações não salvas")');
    }

    $page->assertNoJavaScriptErrors();
    expect($sheet->fresh()->instructions)->toBe('Ajustar a barra.');
})->with([[false, 390], [true, 1366]]);
