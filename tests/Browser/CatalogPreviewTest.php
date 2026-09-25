<?php

use App\Models\CatalogSetting;
use App\Models\Order;
use App\Models\Product;
use App\Models\StockOffer;
use App\Models\StockOfferVolume;
use Database\Seeders\CatalogDemoSeeder;
use Database\Seeders\FullSizeCatalogDemoSeeder;
use Illuminate\Support\Facades\Vite;

beforeEach(function (): void {
    config(['inertia.ssr.enabled' => false]);
    config(['filesystems.disks.public.url' => '/storage']);
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
        ->type('#catalog-search', 'blusa')
        ->assertSee('1 encontrado')
        ->assertScript('document.body.innerText.includes("Grade Furada")')
        ->type('#catalog-search', 'calca')
        ->assertSee('2 encontrados')
        ->assertScript('document.body.innerText.includes("Grade Reposição")')
        ->assertDontSee('Bermuda Jeans')
        ->type('#catalog-search', 'referencia-inexistente')
        ->assertSee('Nenhum produto encontrado')
        ->click('Ver todos os produtos')
        ->assertSee('9 encontrados')
        ->assertScript('document.documentElement.scrollWidth <= window.innerWidth')
        ->assertNoJavaScriptErrors();
});

it('loads the next product batch without depending on translated pagination labels', function () {
    foreach (range(1, 13) as $index) {
        $product = Product::factory()->create([
            'name' => sprintf('ZZ Produto adicional %02d', $index),
        ]);
        $offer = StockOffer::factory()->replenishment()->for($product)->create();
        StockOfferVolume::factory()->for($offer)->withTotal(4)->create();
    }

    visit(route('catalog', [], false))
        ->resize(1280, 900)
        ->assertCount('[data-testid="catalog-product"]', 12)
        ->click('Carregar mais produtos')
        ->assertCount('[data-testid="catalog-product"]', 22)
        ->assertSee('ZZ Produto adicional 13')
        ->assertNoJavaScriptErrors();
});

it('renders generated photos and a compact fallback for visible product cards', function () {
    $wideLeg = Product::query()->where('code', 'DEMO-CJ-0001')->firstOrFail();

    expect($wideLeg->getMedia(Product::MEDIA_COLLECTION))->toHaveCount(2);

    visit(route('catalog', [], false))
        ->resize(1280, 900)
        ->assertCount('[data-testid="catalog-product"]', 9)
        ->assertCount('img[data-testid^="catalog-product-image-"]', 9)
        ->assertSee('Produto sem foto')
        ->assertSee('Tamanhos não informados')
        ->assertPresent('[aria-label="Tamanhos não informados"]')
        ->assertVisible('button[aria-label="Imagem indisponível. Ver sacos de Blusa sem foto"]')
        ->assertScript("(() => Array.from(document.querySelectorAll('[data-testid=\"catalog-product\"]')).every((card) => card.querySelector('img[data-testid^=\"catalog-product-image-\"]') !== null || card.textContent?.includes('Produto sem foto')))()")
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

it('opens the product image gallery when a catalog image is clicked', function () {
    visit(route('catalog', [], false))
        ->resize(390, 844)
        ->click('button[aria-label="Ampliar imagem de Calça Wide Leg"]')
        ->assertVisible('[data-testid="galeria-produto-1"]')
        ->assertVisible('input[aria-label="Zoom da imagem de Calça Wide Leg"]')
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
        ->assertSee('1 encontrado')
        ->assertSee('Calça Reta')
        ->assertDontSee('Calça Wide Leg')
        ->click('Limpar filtros')
        ->assertSee('9 encontrados')
        ->assertNoJavaScriptErrors();
});

it('keeps the complete numeric size grid on one row in the mobile card', function () {
    $this->seed(FullSizeCatalogDemoSeeder::class);

    visit(route('catalog', [], false))
        ->resize(390, 844)
        ->assertSee('Calça Jeans 34 a 46')
        ->assertScript("(() => { const card = [...document.querySelectorAll('[data-testid=\"catalog-product\"]')].find((item) => item.textContent?.includes('Calça Jeans 34 a 46')); const sizes = card?.querySelector('[aria-label=\"Tamanhos presentes\"]'); const button = card?.querySelector('button[aria-label=\"Adicionar Calça Jeans 34 a 46 ao pedido\"]'); const chips = sizes ? [...sizes.children] : []; return chips.length === 7 && new Set(chips.map((chip) => Math.round(chip.getBoundingClientRect().top))).size === 1 && button !== null && button.getBoundingClientRect().top - sizes.getBoundingClientRect().bottom >= 12; })()")
        ->assertNoJavaScriptErrors();
});

it('opens product selection in a side panel on desktop', function () {
    visit(route('catalog', [], false))
        ->resize(1280, 900)
        ->click('button[aria-label="Adicionar Calça Wide Leg ao pedido"]')
        ->assertVisible('[data-slot="sheet-content"]')
        ->assertSee('Escolha os sacos completos.')
        ->assertScript("(() => { const panel = document.querySelector('[data-slot=\"sheet-content\"][data-state=\"open\"]'); return panel !== null && panel.getBoundingClientRect().left > window.innerWidth / 2 && panel.getBoundingClientRect().right <= window.innerWidth; })()")
        ->assertNoJavaScriptErrors();
});

it('shows the quantity of each size in every sack', function () {
    visit(route('catalog', [], false))
        ->resize(390, 844)
        ->click('button[aria-label="Adicionar Short Mom ao pedido"]')
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
        ->click('button[aria-label="Adicionar Calça Wide Leg ao pedido"]')
        ->click('button[aria-label="Adicionar Saco 01"]')
        ->click('button:has-text("Revisar sacola (1)")')
        ->assertVisible('[data-slot="sheet-content"]')
        ->assertSee('Sua sacola')
        ->assertSee('1 saco · 20 peças no total')
        ->assertScript("(() => { const panel = document.querySelector('[data-slot=\"sheet-content\"][data-state=\"open\"]'); return panel !== null && panel.getBoundingClientRect().left > window.innerWidth / 2 && panel.getBoundingClientRect().right <= window.innerWidth; })()")
        ->assertNoJavaScriptErrors();
});

it('requires opening WhatsApp before confirming a catalog order', function () {
    CatalogSetting::factory()->create(['whatsapp_number' => '5511988887777']);

    $page = visit(route('catalog', [], false))
        ->resize(1280, 900)
        ->click('button[aria-label="Adicionar Calça Wide Leg ao pedido"]')
        ->click('button[aria-label="Adicionar Saco 01"]')
        ->click('button:has-text("Revisar sacola (1)")')
        ->type('#catalog-store-name', 'Loja Centro')
        ->type('#catalog-requester-name', 'Ana')
        ->click('button:has-text("Registrar pedido")')
        ->assertVisible('[data-testid="finalizar-whatsapp"]')
        ->assertDisabled('[data-testid="confirmar-pedido"]')
        ->assertSee('Depois de abrir o WhatsApp, volte aqui para concluir o pedido.');

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
        ->click('button[aria-label="Adicionar Short Mom ao pedido"]')
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
        ->click('button[aria-label="Adicionar Calça Wide Leg ao pedido"]')
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
        ->click('button[aria-label="Adicionar Calça Wide Leg ao pedido"]')
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

it('identifies a selected sack that became unavailable', function () {
    $product = Product::query()->where('name', 'Calça Wide Leg')->firstOrFail();
    $volume = $product->latestOffer->stockVolumes->sortBy('sort_order')->firstOrFail();

    $page = visit(route('catalog', [], false))->resize(390, 844);
    $page->script('localStorage.removeItem("catalog-bag");');

    $page
        ->click('button[aria-label="Adicionar Calça Wide Leg ao pedido"]')
        ->click('button[aria-label="Adicionar Saco 01"]')
        ->click('button:has-text("Continuar escolhendo")');

    $volume->update(['current_order_id' => Order::factory()->create()->id]);

    $page
        ->refresh()
        ->click('button[aria-label="Ver sacola, 1 sacos"]')
        ->assertSee('Calça Wide Leg')
        ->assertSee($product->code)
        ->assertSee('Saco 01')
        ->assertSee('Este saco deixou de estar disponível.')
        ->assertNoJavaScriptErrors();
});

it('selects each physical sack once and removes it from the preview bag', function () {
    visit(route('home', [], false))
        ->resize(390, 844)
        ->click('button[aria-label="Adicionar Calça Wide Leg ao pedido"]')
        ->click('button[aria-label="Adicionar Saco 01"]')
        ->assertVisible('button[aria-label="Remover Saco 01 da sacola"]')
        ->click('button:has-text("Revisar sacola (1)")')
        ->assertSee('1 saco · 20 peças no total')
        ->assertDontSee('Esta é uma demonstração.')
        ->click('button[aria-label="Remover Saco 01 de Calça Wide Leg"]')
        ->assertSee('Sua sacola está vazia.')
        ->assertNoJavaScriptErrors();
});
