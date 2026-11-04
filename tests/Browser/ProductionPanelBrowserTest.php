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

it('creates, edits and divides a size grid without losing quantities', function (int $width): void {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);
    Product::factory()->create(['name' => 'Peça com grade', 'is_active' => true]);
    Workshop::factory()->create(['name' => 'Costura A', 'type' => WorkshopType::Sewing]);
    Workshop::factory()->create(['name' => 'Costura B', 'type' => WorkshopType::Sewing]);

    $page = visit(route('production.index', [], false))->resize($width, 844)
        ->click('Novo lote')->click('#batch-product')->click('[role="option"]:has-text("Peça com grade")')
        ->fill('#batch-quantity', '5')->click('Adicionar tamanho')
        ->fill('#sizes-name-0', '36')->fill('#sizes-quantity-0', '2')
        ->click('Adicionar tamanho')->fill('#sizes-name-1', 'G')->fill('#sizes-quantity-1', '3')
        ->assertScript("document.querySelector('#sizes-quantity-1').getBoundingClientRect().bottom <= document.querySelector('[data-slot=drawer-footer]').getBoundingClientRect().top")
        ->wait(1)->screenshot(filename: "grade-criacao-{$width}")
        ->click('Criar lote')->assertSee('Peça com grade')
        ->assertPresent('[aria-label="Tamanho 36, 2 peças"]');
    $batch = ProductionBatch::query()->sole();
    $page->click('button[aria-label="Mais ações de '.$batch->code.'"]')
        ->click('[role="menuitem"]:has-text("Editar grade")')
        ->fill('#sizes-quantity-0', '1')->fill('#sizes-quantity-1', '4')
        ->assertScript("document.querySelector('#sizes-quantity-1').getBoundingClientRect().bottom <= document.querySelector('[data-slot=drawer-footer]').getBoundingClientRect().top")
        ->wait(1)->screenshot(filename: "grade-edicao-{$width}")
        ->click('Salvar grade')->assertPresent('[aria-label="Tamanho 36, 1 peça"]')
        ->click('button:has-text("Peça com grade")')->assertSee('Grade atualizada')
        ->keys('[role=dialog]', 'Escape')->assertMissing('[role=dialog]')
        ->click('button:visible:has-text("Avançar para Costura")')
        ->click('Dividir entre oficinas')
        ->click('#split-workshop-0')->click('[role="option"]:has-text("Costura A")')
        ->fill('#split-size-0-0', '1')->fill('#split-size-0-1', '1')
        ->click('#split-workshop-1')->click('[role="option"]:has-text("Costura B")')
        ->fill('#split-size-1-0', '0')->fill('#split-size-1-1', '3')
        ->assertScript("document.querySelector('#split-size-1-1').getBoundingClientRect().bottom <= document.querySelector('[data-slot=drawer-footer]').getBoundingClientRect().top")
        ->assertValue('#split-quantity-0', '2')->assertValue('#split-quantity-1', '3')
        ->assertSee('36: 1 de 1 peça informada.')
        ->assertSee('G: 4 de 4 peças informadas.')
        ->wait(1)->screenshot(filename: "grade-divisao-{$width}")
        ->click('Dividir e enviar')
        ->assertSee('Oficina: Costura A')->assertSee('Oficina: Costura B')
        ->assertNoJavaScriptErrors();
    expect(ProductionBatch::query()->where('parent_id', $batch->id)->count())->toBe(2);
})->with([390, 1366]);
