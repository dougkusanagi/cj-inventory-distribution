<?php

use App\Enums\ProductionStage;
use App\Enums\WorkshopType;
use App\Models\Product;
use App\Models\ProductionBatch;
use App\Models\StockOfferVolume;
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

    $page = visit(route('production.index', ['abrir' => 'novo-lote'], false))
        ->resize($width, 844)
        ->assertSee('Planejamento')
        ->wait(0.5)
        ->click('#batch-product')
        ->click('button[aria-label^="Selecionar Calça produção teste"]')
        ->fill('#batch-quantity', '12')
        ->click('Criar lote')
        ->assertSee('Calça produção teste')
        ->assertSee('12 peças')
        ->screenshot(filename: "producao-{$width}")
        ->assertScript("Array.from(document.querySelectorAll('[data-testid=production-batch]')).every(card => Array.from(card.querySelectorAll('button')).every(button => button.getBoundingClientRect().right <= card.getBoundingClientRect().right))")
        ->click('button:visible:has-text("Avançar para Corte")')
        ->click('nav[aria-label="Ir para a etapa"] button:has-text("Corte")')
        ->wait(0.6)
        ->click('button:visible:has-text("Recebi")')
        ->click('button:visible:has-text("Avançar para Costura")')
        ->click('Enviar lote')
        ->click('nav[aria-label="Ir para a etapa"] button:has-text("Costura")')
        ->wait(0.6)
        ->assertVisible('button:visible:has-text("Recebi")')
        ->screenshot(filename: "recebimento-{$width}")
        ->click('button:visible:has-text("Recebi")')
        ->assertSee('Avançar para Lavanderia')
        ->assertNoJavaScriptErrors();

    $batch = ProductionBatch::query()->sole();
    expect($batch->stage->value)->toBe('sewing')
        ->and($batch->received_by)->toBe($user->id)
        ->and($batch->quantity)->toBe(12);
    $page->assertScript('document.documentElement.scrollWidth <= window.innerWidth');
})->with([320, 390, 768, 1366]);

it('opens the new batch panel from the production menu and forgets it after closing', function (): void {
    $this->actingAs(User::factory()->admin()->create());
    Product::factory()->create(['is_active' => true]);

    visit(route('production.index', [], false))
        ->resize(1366, 844)
        ->click('nav button:has-text("Produção")')
        ->click('[role="menuitem"]:has-text("Novo lote")')
        ->assertSee('O lote começa na etapa de Planejamento.')
        ->keys('#batch-quantity', 'Escape')
        ->assertMissing('[role="dialog"]')
        ->wait(0.5)
        ->assertScript("! window.location.search.includes('abrir')")
        ->assertNoJavaScriptErrors();
});

it('creates and selects a workshop when sending a batch', function (int $width): void {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);
    $batch = receivedCuttingBatch(Product::factory()->create(['is_active' => true]), 12, null, $admin);

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
        ->assertPresent('[title="Oficina: Oficina Horizonte"]')
        ->assertNoJavaScriptErrors();
    expect($batch->fresh()->workshop?->name)->toBe('Oficina Horizonte');
})->with([390, 1366]);

it('divides and sends a batch between two workshops', function (int $width): void {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);
    $batch = receivedCuttingBatch(Product::factory()->create(['is_active' => true]), 10, null, $admin);
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
        ->assertPresent('[title="Oficina: Oficina Aurora"]')
        ->assertPresent('[title="Oficina: Oficina Horizonte"]')
        ->assertNoJavaScriptErrors();
    expect(ProductionBatch::query()->where('parent_id', $batch->id)->sum('quantity'))->toBe(10);
})->with([390, 1366]);

it('returns focus after closing the workshop split panel', function (): void {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);
    receivedCuttingBatch(Product::factory()->create(['is_active' => true]), 10, null, $admin);

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
    receivedCuttingBatch(Product::factory()->create(['is_active' => true]), 1, null, $admin);

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

    $page = visit(route('production.index', ['abrir' => 'novo-lote'], false))->resize($width, 844)
        ->click('#batch-product')
        ->assertVisible('button[aria-label="Selecionar Peça com grade"]')
        ->click('button[aria-label="Selecionar Peça com grade"]')
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
        ->click('button:visible:has-text("Avançar para Corte")')
        ->assertPresent('[data-stage=cutting] button:visible:has-text("Recebi")')
        ->click('nav[aria-label="Ir para a etapa"] button:has-text("Corte")')
        ->click('[data-stage=cutting] button:visible:has-text("Recebi")')
        ->click('[data-stage=cutting] button:visible:has-text("Avançar para Costura")')
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
        ->assertPresent('[title="Oficina: Costura A"]')->assertPresent('[title="Oficina: Costura B"]')
        ->assertNoJavaScriptErrors();
    expect(ProductionBatch::query()->where('parent_id', $batch->id)->count())->toBe(2);
})->with([390, 1366]);

it('warns about batches stalled in the same stage without overflowing the cards', function (int $width): void {
    $this->actingAs(User::factory()->admin()->create());
    $product = Product::factory()->create(['name' => 'Calça parada '.str_repeat('SUPERCALCA', 6), 'is_active' => true]);
    ProductionBatch::factory()->create([
        'product_id' => $product->id,
        'stage' => ProductionStage::Washing,
        'received_at' => now(),
        'stage_entered_at' => now()->subDays(ProductionBatch::STALLED_AFTER_DAYS + 4),
    ]);
    ProductionBatch::factory()->create(['product_id' => $product->id, 'stage' => ProductionStage::Washing, 'received_at' => now()]);

    visit(route('production.index', [], false))
        ->resize($width, 844)
        ->assertSee('1 lote parado há mais de '.ProductionBatch::STALLED_AFTER_DAYS.' dias')
        ->assertSee('Parado há')
        ->screenshot(filename: "producao-parado-{$width}")
        ->assertScript('document.documentElement.scrollWidth <= window.innerWidth')
        ->assertScript("document.querySelectorAll('[data-testid=production-batch]').length === 2");
})->with([390, 1366]);

it('lays out canvas sectors horizontally on desktop and vertically on mobile', function (): void {
    $this->actingAs(User::factory()->admin()->create());
    ProductionBatch::factory()->inStage(ProductionStage::Sewing)->create();
    visit(route('production.index', [], false))->resize(1366, 900)
        ->assertCount('[data-testid=flow-stage]', 6)
        ->assertScript("Array.from(document.querySelectorAll('[data-testid=flow-stage]')).every((column, index, columns) => index === 0 || Math.abs(column.getBoundingClientRect().top - columns[0].getBoundingClientRect().top) < 2)")
        ->resize(390, 844)->wait(0.6)
        ->assertScript("Array.from(document.querySelectorAll('[data-testid=flow-stage]')).every((column, index, columns) => index === 0 || column.getBoundingClientRect().top > columns[index - 1].getBoundingClientRect().top)")
        ->assertScript('document.documentElement.scrollWidth <= window.innerWidth')
        ->assertNoJavaScriptErrors();
});

it('gives a single-sector worker only their sector on the canvas', function (): void {
    $this->actingAs(User::factory()->production(ProductionStage::Sewing)->create());
    ProductionBatch::factory()->inStage(ProductionStage::Sewing)->create();
    visit(route('production.index', [], false))->resize(1366, 900)
        ->assertMissing('#stage-filter')->assertCount('[data-testid=flow-stage]', 1)
        ->assertPresent('[data-stage=sewing]')->assertNoJavaScriptErrors();
});

it('sends a bagged batch to stock without creating stock sacks', function (): void {
    $this->actingAs(User::factory()->admin()->create());
    $batch = ProductionBatch::factory()->inStage(ProductionStage::Finishing)->create(['received_at' => now()]);

    visit(route('production.index', [], false))
        ->resize(390, 844)
        ->click('button:visible:has-text("Enviar para o estoque")')
        ->assertSee('Os sacos não são criados automaticamente')
        ->click('[role="dialog"] button:has-text("Enviar para o estoque")')
        ->assertSee('Estoque')
        ->assertMissing('button:visible:has-text("Enviar para o estoque")')
        ->assertNoJavaScriptErrors();

    expect($batch->fresh()->stage)->toBe(ProductionStage::Completed)
        ->and(StockOfferVolume::query()->count())->toBe(0);
});

it('keeps the canvas inside the screen with many batches', function (): void {
    $this->actingAs(User::factory()->admin()->create());
    ProductionBatch::factory()->count(12)->inStage(ProductionStage::Sewing)->create(['received_at' => now()]);
    visit(route('production.index', [], false))->resize(1366, 768)
        ->assertScript('document.documentElement.scrollHeight <= window.innerHeight')
        ->assertScript("document.querySelector('[data-testid=production-flow]').getBoundingClientRect().bottom <= window.innerHeight")
        ->assertCount('[data-flow-batch]', 12)->assertNoJavaScriptErrors();
});

it('separates batches awaiting receipt from batches already received', function (): void {
    $this->actingAs(User::factory()->admin()->create());
    ProductionBatch::factory()->inStage(ProductionStage::Sewing)->create(['received_at' => null]);
    ProductionBatch::factory()->inStage(ProductionStage::Sewing)->create(['received_at' => now()]);
    visit(route('production.index', [], false))->resize(1366, 768)
        ->assertSee('A receber')->assertSee('No setor')
        ->assertPresent('[data-stage=sewing] button:has-text("Recebi")')
        ->assertPresent('[data-stage=sewing] button:has-text("Avançar para Lavanderia")')
        ->assertNoJavaScriptErrors();
});

it('highlights search results and restores all batches after clearing the search', function (int $width): void {
    $this->actingAs(User::factory()->admin()->create());
    $batch = ProductionBatch::factory()->inStage(ProductionStage::Washing)->create();
    ProductionBatch::factory()->inStage(ProductionStage::Sewing)->create();
    visit(route('production.index', [], false))->resize($width, 844)
        ->fill('#flow-search', $batch->fresh()->code)
        ->assertCount('[data-flow-batch].opacity-25', 1)
        ->fill('#flow-search', 'nada-encontrado')
        ->assertCount('[data-flow-batch].opacity-25', 2)
        ->fill('#flow-search', '')
        ->assertCount('[data-flow-batch].opacity-25', 0)
        ->assertNoJavaScriptErrors();
})->with([390, 1366]);

it('jumps to a sector from the canvas shortcut bar', function (): void {
    $this->actingAs(User::factory()->admin()->create());
    ProductionBatch::factory()->inStage(ProductionStage::Finishing)->create();
    visit(route('production.index', [], false))->resize(1366, 768)
        ->click('nav[aria-label="Ir para a etapa"] button:has-text("Acabamento")')->wait(0.6)
        ->assertVisible('[data-stage=finishing] button:visible:has-text("Enviar para o estoque")')
        ->assertNoJavaScriptErrors();
});

it('chooses a product with photos in three views without losing the batch form', function (int $width): void {
    $this->actingAs(User::factory()->admin()->create());
    $product = Product::factory()->create(['name' => 'Calça seleção '.str_repeat('NOMESEMESPACOS', 6), 'model' => 'Wide leg', 'is_active' => true]);
    $product->addMedia(public_path('images/products/calca-wide-leg.png'))->preservingOriginal()->toMediaCollection(Product::MEDIA_COLLECTION);
    $product->addMedia(public_path('images/products/calca-reta.png'))->preservingOriginal()->toMediaCollection(Product::MEDIA_COLLECTION);
    Product::factory()->create(['name' => 'Produto sem fotografia', 'is_active' => true]);

    $page = visit(route('production.index', ['abrir' => 'novo-lote'], false))->resize($width, 844)
        ->fill('#batch-quantity', '25')->fill('#batch-notes', 'Preservar observação')
        ->click('#batch-product')->assertSee('Escolher produto')
        ->assertSee('Sem foto')
        ->assertPresent('img[alt*="Calça seleção"]')
        ->assertScript("Array.from(document.querySelectorAll('[data-testid=production-product-grid] h3')).every(title => title.scrollWidth <= title.clientWidth + 1)")
        ->click('button[aria-label^="Próxima imagem de Calça seleção"]')
        ->click('button[aria-label="Lista"]')
        ->assertAttribute('[data-testid=production-product-grid]', 'data-view', 'list')
        ->screenshot(filename: "selecao-produto-lista-{$width}")
        ->click('button[aria-label="Cards grandes"]')
        ->assertAttribute('[data-testid=production-product-grid]', 'data-view', 'large')
        ->screenshot(filename: "selecao-produto-grande-{$width}")
        ->click('button[aria-label="Cards compactos"]')
        ->assertAttribute('[data-testid=production-product-grid]', 'data-view', 'compact')
        ->screenshot(filename: "selecao-produto-compacto-{$width}")
        ->fill('#production-product-search', 'nao existe')->assertSee('Nenhum produto encontrado')
        ->click('Limpar busca')->fill('#production-product-search', 'wide')
        ->assertMissing('button[aria-label="Selecionar Produto sem fotografia"]')
        ->click('button[aria-label^="Selecionar Calça seleção"]')
        ->assertSee('Novo lote')->assertValue('#batch-quantity', '25')
        ->assertValue('#batch-notes', 'Preservar observação')
        ->screenshot(filename: "novo-lote-produto-{$width}")
        ->click('#batch-product')->click('Voltar ao lote')
        ->assertValue('#batch-quantity', '25')
        ->assertScript('document.documentElement.scrollWidth <= window.innerWidth')
        ->assertNoJavaScriptErrors();

    $page->click('Criar lote')->assertSee('Lote criado');
    expect(ProductionBatch::query()->sole()->product_id)->toBe($product->id);
})->with([390, 768, 1366]);
