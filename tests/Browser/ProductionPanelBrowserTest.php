<?php

use App\Actions\Production\ManageProductionBatch;
use App\Enums\WorkshopType;
use App\Models\Product;
use App\Models\ProductionBatch;
use App\Models\User;
use App\Models\Workshop;
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
        ->click('Enviar lote')
        ->assertVisible('button:visible:has-text("Recebi")')
        ->screenshot(filename: "recebimento-{$width}")
        ->click('button:visible:has-text("Recebi")')
        ->assertSee('Avançar para Lavagem')
        ->assertNoJavaScriptErrors();

    $batch = ProductionBatch::query()->sole();
    expect($batch->stage->value)->toBe('sewing')
        ->and($batch->received_by)->toBe($user->id)
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

it('creates and selects a workshop when sending a batch', function (int $width): void {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);
    $batch = app(ManageProductionBatch::class)->create(Product::factory()->create(['is_active' => true]), 12, null, $admin);

    visit(route('production.index', [], false))->resize($width, 844)
        ->click('button:visible:has-text("Avançar para Costura")')
        ->click('#workshop-select')
        ->fill('[aria-label="Buscar oficina"]', 'Oficina Horizonte')
        ->click('Cadastrar oficina')
        ->fill('#workshop-name', 'Oficina Horizonte')
        ->click('button:visible:has-text("Cadastrar oficina")')
        ->assertSee('Oficina Horizonte')
        ->screenshot(filename: "oficina-{$width}")
        ->click('Enviar lote')
        ->assertSee('Oficina: Oficina Horizonte')
        ->assertNoJavaScriptErrors();
    expect($batch->fresh()->workshop?->name)->toBe('Oficina Horizonte');
})->with([390, 1366]);

it('divides and sends a batch between two workshops', function (int $width): void {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);
    $batch = app(ManageProductionBatch::class)->create(Product::factory()->create(['is_active' => true]), 10, null, $admin);
    Workshop::factory()->create(['name' => 'Oficina Aurora', 'type' => WorkshopType::Sewing]);
    Workshop::factory()->create(['name' => 'Oficina Horizonte', 'type' => WorkshopType::Sewing]);

    visit(route('production.index', [], false))->resize($width, 844)
        ->click('button:visible:has-text("Avançar para Costura")')
        ->click('Dividir entre oficinas')
        ->assertSee('não poderá ser reunido pelo painel')
        ->click('#split-workshop-0')->click('[role="option"]:has-text("Oficina Aurora")')
        ->fill('#split-quantity-0', '4')
        ->click('#split-workshop-1')->click('[role="option"]:has-text("Oficina Horizonte")')
        ->fill('#split-quantity-1', '6')
        ->assertSee('Distribuído: 10 de 10 peças')
        ->screenshot(filename: "divisao-{$width}")
        ->click('Dividir e enviar')
        ->assertSee('Oficina: Oficina Aurora')
        ->assertSee('Oficina: Oficina Horizonte')
        ->assertNoJavaScriptErrors();
    expect(ProductionBatch::query()->where('parent_id', $batch->id)->sum('quantity'))->toBe(10);
})->with([390, 1366]);

it('returns focus after closing the workshop split panel', function (): void {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);
    app(ManageProductionBatch::class)->create(Product::factory()->create(['is_active' => true]), 10, null, $admin);

    visit(route('production.index', [], false))
        ->resize(390, 844)
        ->click('button:visible:has-text("Avançar para Costura")')
        ->click('Dividir entre oficinas')
        ->keys('#split-quantity-0', 'Escape')
        ->assertMissing('[role="dialog"]')
        ->assertScript("document.activeElement?.textContent?.includes('Avançar para Costura') === true")
        ->assertNoJavaScriptErrors();
});

it('explains why a batch with one piece cannot be divided', function (): void {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);
    app(ManageProductionBatch::class)->create(Product::factory()->create(['is_active' => true]), 1, null, $admin);

    visit(route('production.index', [], false))->resize(390, 844)
        ->click('button:visible:has-text("Avançar para Costura")')
        ->assertDisabled('button:has-text("Dividir entre oficinas")')
        ->assertSee('A divisão exige pelo menos duas peças.')
        ->assertNoJavaScriptErrors();
});
