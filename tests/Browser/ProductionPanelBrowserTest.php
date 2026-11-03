<?php

use App\Models\Product;
use App\Models\ProductionBatch;
use App\Models\User;
use Illuminate\Support\Facades\Vite;

beforeEach(function (): void {
    config(['inertia.ssr.enabled' => false]);
    Vite::useHotFile(storage_path('framework/testing-hot-file'));
});

it('creates and advances a production batch in the panel', function (int $width): void {
    $user = User::factory()->admin()->create();
    $product = Product::factory()->create(['name' => 'Calça produção teste '.str_repeat('SUPERCALCA', 6), 'is_active' => true]);
    $this->actingAs($user);

    $page = visit(route('production.index', [], false))
        ->resize($width, 844)
        ->assertSee('Aguardando ensacamento')
        ->click('Novo lote')
        ->click('#batch-product')
        ->click('[role="option"]:has-text("Calça produção teste")')
        ->fill('#batch-quantity', '12')
        ->click('Criar lote')
        ->assertSee('Calça produção teste')
        ->assertSee('12 peças')
        ->screenshot(filename: "producao-{$width}")
        ->assertScript("Array.from(document.querySelectorAll('[data-testid=production-batch]')).every(card => Array.from(card.querySelectorAll('button')).every(button => button.getBoundingClientRect().right <= card.getBoundingClientRect().right))")
        ->click('summary:has-text("Corte")')
        ->assertScript("!document.querySelector('[data-testid=production-batch]').closest('details').open")
        ->click('summary:has-text("Corte")')
        ->click('button:visible:has-text("Avançar para Costura")')
        ->assertSee('Costura')
        ->assertNoJavaScriptErrors();

    $batch = ProductionBatch::query()->sole();
    expect($batch->stage->value)->toBe('sewing')
        ->and($batch->quantity)->toBe(12);
    $page->assertScript('document.documentElement.scrollWidth <= window.innerWidth');
})->with([320, 390, 768, 1366]);

it('returns keyboard focus to the button that opened the new batch panel', function (): void {
    $this->actingAs(User::factory()->admin()->create());
    Product::factory()->create(['is_active' => true]);

    visit(route('production.index', [], false))
        ->resize(390, 844)
        ->click('Novo lote')
        ->keys('#batch-quantity', 'Escape')
        ->assertMissing('[role="dialog"]')
        ->assertScript("document.activeElement?.textContent?.includes('Novo lote') === true")
        ->assertNoJavaScriptErrors();
});
