<?php

use App\Models\CatalogSetting;
use Database\Seeders\CatalogDemoSeeder;
use Illuminate\Support\Facades\Vite;

beforeEach(function (): void {
    config(['inertia.ssr.enabled' => false]);
    Vite::useHotFile(storage_path('framework/testing-hot-file'));
    $this->seed(CatalogDemoSeeder::class);
});

it('replaces the starter home with a searchable catalog and never shows new grade offers', function () {
    visit(route('home', [], false))
        ->resize(390, 844)
        ->assertSee('Reabasteça sua loja')
        ->assertDontSee('Catálogo de demonstração.')
        ->assertDontSee('Produtos ilustrativos')
        ->assertDontSee('Grade Nova')
        ->assertDontSee('Produto interno de grade nova')
        ->type('#catalog-search', 'calca')
        ->assertSee('2 produtos encontrados')
        ->assertDontSee('Bermuda Jeans')
        ->type('#catalog-search', 'referencia-inexistente')
        ->assertSee('Nenhum produto encontrado')
        ->click('Ver todos os produtos')
        ->assertSee('7 produtos encontrados')
        ->assertScript('document.documentElement.scrollWidth <= window.innerWidth')
        ->assertNoJavaScriptErrors();
});

it('renders a generated photo for each visible product card', function () {
    visit(route('catalog', [], false))
        ->resize(1280, 900)
        ->assertCount('img[data-testid^="catalog-product-image-"]', 8)
        ->assertScript("(() => Array.from(document.querySelectorAll('img[data-testid^=\"catalog-product-image-\"]')).every((image) => image.getAttribute('src')?.includes('/storage/')))()")
        ->assertAttributeContains(
            'img[data-testid="catalog-product-image-1"]',
            'src',
            '/storage/',
        )
        ->assertAttribute(
            'img[data-testid="catalog-product-image-1"]',
            'alt',
            'Calça Wide Leg - Imagem 1',
        )
        ->assertNoJavaScriptErrors();
});

it('navigates through all product images in the card carousel', function () {
    visit(route('catalog', [], false))
        ->resize(390, 844)
        ->assertCount(
            'button[aria-label^="Ir para a imagem"]',
            2,
        )
        ->assertVisible('button[aria-label="Próxima imagem de Calça Wide Leg"]')
        ->click('button[aria-label="Próxima imagem de Calça Wide Leg"]')
        ->assertAttribute(
            '[role="group"][aria-label="Imagem 2 de 2"]',
            'aria-label',
            'Imagem 2 de 2',
        )
        ->assertAttribute(
            'img[alt="Calça Wide Leg - Imagem 2"]',
            'alt',
            'Calça Wide Leg - Imagem 2',
        )
        ->assertNoJavaScriptErrors();
});

it('changes the catalog theme from the top navigation selector', function () {
    visit(route('catalog', [], false))
        ->resize(390, 844)
        ->assertPresent('button[aria-label="Selecionar tema da interface"]')
        ->click('button[aria-label="Selecionar tema da interface"]')
        ->assertSee('Sistema')
        ->assertSee('Claro')
        ->assertSee('Escuro')
        ->click('[role="menuitemradio"]:has-text("Escuro")')
        ->assertScript('document.documentElement.classList.contains("dark")')
        ->assertScript('localStorage.getItem("appearance") === "dark"')
        ->assertNoJavaScriptErrors();
});

it('combines category and line filters and clears them', function () {
    visit(route('catalog', [], false))
        ->resize(1280, 900)
        ->click('#catalog-category')
        ->click('[role="option"]:has-text("Calça")')
        ->click('#catalog-line')
        ->click('[role="option"]:has-text("Plus")')
        ->assertSee('1 produto encontrado')
        ->assertSee('Calça Reta')
        ->assertDontSee('Calça Wide Leg')
        ->click('Limpar filtros')
        ->assertSee('7 produtos encontrados')
        ->assertNoJavaScriptErrors();
});

it('opens product selection in a side panel on desktop', function () {
    visit(route('catalog', [], false))
        ->resize(1280, 900)
        ->click('button[aria-label="Ver sacos de Calça Wide Leg"]')
        ->assertVisible('[data-slot="sheet-content"]')
        ->assertSee('Escolha os sacos completos.')
        ->assertScript("(() => { const panel = document.querySelector('[data-slot=\"sheet-content\"][data-state=\"open\"]'); return panel !== null && panel.getBoundingClientRect().left > window.innerWidth / 2 && panel.getBoundingClientRect().right <= window.innerWidth; })()");
});

it('shows the quantity of each size in every sack', function () {
    visit(route('catalog', [], false))
        ->resize(390, 844)
        ->click('button[aria-label="Escolher sacos de Short Mom"]')
        ->assertSee('Conteúdo por tamanho')
        ->assertVisible('[aria-label="Tamanho 36, 4 peças"]')
        ->assertVisible('[aria-label="Tamanho 40, 4 peças"]')
        ->assertVisible('[aria-label="Tamanho 34, 5 peças"]')
        ->assertVisible('[aria-label="Tamanho 38, 5 peças"]')
        ->assertDontSee('Quantidade por tamanho não informada.')
        ->assertNoJavaScriptErrors();
});

it('opens the bag in a side panel on desktop', function () {
    visit(route('catalog', [], false))
        ->resize(1280, 900)
        ->click('button[aria-label="Escolher sacos de Calça Wide Leg"]')
        ->click('button[aria-label="Adicionar Saco 01"]')
        ->click('button:has-text("Revisar sacola (1)")')
        ->assertVisible('[data-slot="sheet-content"]')
        ->assertSee('Sua sacola')
        ->assertSee('1 saco · 20 peças no total')
        ->assertScript("(() => { const panel = document.querySelector('[data-slot=\"sheet-content\"][data-state=\"open\"]'); return panel !== null && panel.getBoundingClientRect().left > window.innerWidth / 2 && panel.getBoundingClientRect().right <= window.innerWidth; })()");
});

it('requires opening WhatsApp before confirming a catalog order', function () {
    CatalogSetting::factory()->create(['whatsapp_number' => '5511988887777']);

    $page = visit(route('catalog', [], false))
        ->resize(1280, 900)
        ->click('button[aria-label="Escolher sacos de Calça Wide Leg"]')
        ->click('button[aria-label="Adicionar Saco 01"]')
        ->click('button:has-text("Revisar sacola (1)")')
        ->type('#catalog-store-name', 'Loja Centro')
        ->type('#catalog-requester-name', 'Ana')
        ->click('button:has-text("Registrar pedido")')
        ->assertVisible('[data-testid="finalizar-whatsapp"]')
        ->assertDisabled('[data-testid="confirmar-pedido"]')
        ->assertSee('O botão será liberado depois que você abrir o WhatsApp.');

    $page->script("document.querySelector('[data-testid=\"finalizar-whatsapp\"]')?.click()");

    $page
        ->assertEnabled('[data-testid="confirmar-pedido"]')
        ->click('[data-testid="confirmar-pedido"]')
        ->assertMissing('[data-slot="sheet-content"][data-state="open"]')
        ->assertAttribute(
            'button[aria-label^="Ver sacola"]',
            'aria-label',
            'Ver sacola, 0 sacos',
        )
        ->assertNoJavaScriptErrors();
});

it('removes a selected sack from the product panel without closing it', function () {
    visit(route('home', [], false))
        ->resize(390, 844)
        ->click('button[aria-label="Ver sacos de Short Mom"]')
        ->click('button[aria-label="Adicionar Saco 02"]')
        ->assertVisible('[data-slot="drawer-content"]')
        ->click('button[aria-label="Remover Saco 02 da sacola"]')
        ->assertVisible('[data-slot="drawer-content"]')
        ->assertEnabled('button[aria-label="Adicionar Saco 02"]')
        ->assertNoJavaScriptErrors();
});

it('keeps the bag action in the header without a duplicate fixed action', function () {
    visit(route('home', [], false))
        ->resize(390, 844)
        ->click('button[aria-label="Escolher sacos de Calça Wide Leg"]')
        ->click('button[aria-label="Adicionar Saco 01"]')
        ->click('button:has-text("Continuar escolhendo")')
        ->assertCount('button[aria-label^="Ver sacola"]', 1)
        ->assertCount('button:has-text("Revisar sacola")', 0)
        ->click('button[aria-label="Ver sacola, 1 sacos"]')
        ->assertVisible('[data-slot="drawer-content"]')
        ->assertSee('1 saco · 20 peças no total')
        ->assertNoJavaScriptErrors();
});

it('restores the selected sacks after reloading the catalog', function () {
    $page = visit(route('catalog', [], false))
        ->resize(390, 844);

    $page->script('localStorage.removeItem("catalog-bag");');

    $page
        ->click('button[aria-label="Escolher sacos de Calça Wide Leg"]')
        ->click('button[aria-label="Adicionar Saco 01"]')
        ->click('button:has-text("Continuar escolhendo")')
        ->refresh()
        ->assertAttribute(
            'button[aria-label^="Ver sacola"]',
            'aria-label',
            'Ver sacola, 1 sacos',
        )
        ->click('button[aria-label="Ver sacola, 1 sacos"]')
        ->assertSee('1 saco · 20 peças no total')
        ->assertNoJavaScriptErrors();
});

it('selects each physical sack once and removes it from the preview bag', function () {
    visit(route('home', [], false))
        ->resize(390, 844)
        ->click('button[aria-label="Escolher sacos de Calça Wide Leg"]')
        ->click('button[aria-label="Adicionar Saco 01"]')
        ->assertVisible('button[aria-label="Remover Saco 01 da sacola"]')
        ->click('button:has-text("Revisar sacola (1)")')
        ->assertSee('1 saco · 20 peças no total')
        ->assertDontSee('Esta é uma demonstração.')
        ->click('button[aria-label="Remover Saco 01 de Calça Wide Leg"]')
        ->assertSee('Sua sacola está vazia.')
        ->assertNoJavaScriptErrors();
});
