<?php

use App\Enums\ProductionStage;
use App\Models\Product;
use App\Models\ProductionBatch;
use App\Models\User;
use Illuminate\Support\Facades\Vite;

beforeEach(function (): void {
    config(['inertia.ssr.enabled' => false]);
    Vite::useHotFile(storage_path('framework/testing-hot-file'));
});

it('shows the stages as groups and moves a batch along the flow', function (int $width): void {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);
    receivedCuttingBatch(Product::factory()->create(['name' => 'Calça do fluxo', 'is_active' => true]), 12, null, $admin);
    ProductionBatch::factory()->inStage(ProductionStage::Washing)->stalled()->create(['quantity' => 40]);
    ProductionBatch::factory()->inStage(ProductionStage::Finishing)->awaitingReceipt()->create(['quantity' => 30]);

    $page = visit(route('production.flow', [], false))
        ->resize($width, 844)
        ->assertCount('[data-testid=flow-stage]', count(ProductionStage::active()))
        ->assertSee('Calça do fluxo')
        ->assertPresent('[title="1 lote · 30 peças a receber"]')
        ->screenshot(filename: "fluxo-{$width}")
        ->click('nav[aria-label="Ir para a etapa"] button:has-text("Corte")')
        ->wait(0.6)
        ->click('button:visible:has-text("Avançar para Costura")')
        ->click('Enviar lote')
        ->assertPresent('[title="1 lote · 12 peças a receber"]')
        ->click('nav[aria-label="Ir para a etapa"] button:has-text("Costura")')
        ->wait(0.6)
        ->click('[data-stage=sewing] button:visible:has-text("Recebi")')
        ->assertSee('Avançar para Lavanderia')
        ->screenshot(filename: "fluxo-recebido-{$width}")
        ->assertScript('document.documentElement.scrollWidth <= window.innerWidth')
        ->assertNoJavaScriptErrors();

    expect(ProductionBatch::query()->whereHas('product', fn ($query) => $query->where('name', 'Calça do fluxo'))->sole()->stage)
        ->toBe(ProductionStage::Sewing);
})->with([390, 1366]);

it('highlights the batches found by the search and the attention mode', function (): void {
    $this->actingAs(User::factory()->admin()->create());
    $found = ProductionBatch::factory()->create();
    ProductionBatch::factory()->inStage(ProductionStage::Sewing)->stalled()->create();
    ProductionBatch::factory()->inStage(ProductionStage::Washing)->create();

    visit(route('production.flow', [], false))
        ->resize(1366, 844)
        ->fill('#flow-search', $found->fresh()->code)
        ->wait(0.6)
        ->assertSee('1 de 1')
        ->assertCount('[data-flow-batch].opacity-25', 2)
        ->fill('#flow-search', '')
        ->click('#flow-attention')
        ->assertCount('[data-flow-batch].opacity-25', 2)
        ->screenshot(filename: 'fluxo-atencao-1366')
        ->assertNoJavaScriptErrors();
});

it('opens a batch from a direct link', function (): void {
    $this->actingAs(User::factory()->admin()->create());
    $batch = ProductionBatch::factory()->inStage(ProductionStage::Washing)->create();
    $code = $batch->fresh()->code;

    visit(route('production.flow', ['lote' => $code], false))
        ->resize(390, 844)
        ->assertVisible('[role="dialog"]')
        ->assertSee('Histórico deste lote')
        ->assertVisible('[role="dialog"] button:has-text("Avançar para Acabamento")')
        ->screenshot(filename: 'fluxo-link-390')
        ->assertNoJavaScriptErrors();
});

it('zooms the canvas gradually with the mouse wheel', function (): void {
    $this->actingAs(User::factory()->admin()->create());
    ProductionBatch::factory()->create();
    $zoom = "Number(document.querySelector('.react-flow__viewport').style.transform.match(/scale\\(([\\d.]+)\\)/)[1])";
    $wheel = "document.querySelector('.react-flow').dispatchEvent(new WheelEvent('wheel', { deltaY: %d, clientX: 600, clientY: 400, bubbles: true, cancelable: true }))";

    $page = visit(route('production.flow', [], false))->resize(1366, 844)->wait(0.5);
    $before = $page->script($zoom);
    $page->script(sprintf($wheel, 100));
    $afterOneNotch = $page->script($zoom);
    $page->script(sprintf($wheel, -100));

    expect($afterOneNotch)->toBeLessThan($before)
        ->and($afterOneNotch / $before)->toBeGreaterThan(0.9)
        ->and($page->script($zoom))->toEqualWithDelta($before, 0.001);
    $page->assertNoJavaScriptErrors();
});

it('undoes an advance from the toast', function (): void {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);
    $batch = ProductionBatch::factory()->inStage(ProductionStage::Finishing)->create();

    visit(route('production.flow', [], false))
        ->resize(1366, 844)
        ->click('[data-stage=finishing] button:visible:has-text("Enviar para o estoque")')
        ->click('[role="dialog"] button:has-text("Enviar para o estoque")')
        ->assertSee('enviado para Estoque')
        ->click('[data-sonner-toast] button:has-text("Desfazer")')
        ->assertSee('Último avanço desfeito.')
        ->assertNoJavaScriptErrors();

    expect($batch->fresh()->stage)->toBe(ProductionStage::Finishing)
        ->and($batch->events()->reorder('id', 'desc')->first()->notes)->toBe('Desfeito pelo aviso logo após o envio.');
});

it('toggles canvas controls individually and together', function (int $width): void {
    $this->actingAs(User::factory()->admin()->create());
    visit(route('production.flow', [], false))->resize($width, 844)
        ->click('button[aria-label="Elementos do canvas"]')
        ->click('[role=menuitemcheckbox]:has-text("Busca e filtro")')
        ->assertMissing('#flow-search')
        ->click('[role=menuitemcheckbox]:has-text("Exibir todos")')
        ->assertPresent('#flow-search')
        ->click('[role=menuitemcheckbox]:has-text("Exibir todos")')
        ->assertMissing('#flow-search')
        ->assertMissing('nav[aria-label="Ir para a etapa"]')
        ->assertMissing('.react-flow__minimap')
        ->click('[role=menuitemcheckbox]:has-text("Exibir todos")')
        ->assertPresent('#flow-search')
        ->assertPresent('nav[aria-label="Ir para a etapa"]')
        ->screenshot(filename: "canvas-elementos-{$width}")
        ->assertNoJavaScriptErrors();
})->with([390, 768, 1366]);
