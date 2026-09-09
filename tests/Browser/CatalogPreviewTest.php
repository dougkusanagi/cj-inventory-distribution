<?php

use Illuminate\Support\Facades\Vite;

beforeEach(function (): void {
    config(['inertia.ssr.enabled' => false]);
    Vite::useHotFile(storage_path('framework/testing-hot-file'));
});

it('replaces the starter home with a searchable catalog and never shows new grade offers', function () {
    visit(route('home', [], false))
        ->resize(390, 844)
        ->assertSee('Reabasteça sua loja')
        ->assertSee('Catálogo de demonstração.')
        ->assertDontSee('Grade Nova')
        ->assertDontSee('Produto interno de grade nova')
        ->type('#catalog-search', 'calca')
        ->assertSee('2 produtos encontrados')
        ->assertDontSee('Bermuda Jeans')
        ->type('#catalog-search', 'referencia-inexistente')
        ->assertSee('Nenhum produto encontrado')
        ->click('Ver todos os produtos')
        ->assertSee('6 produtos encontrados')
        ->assertScript('document.documentElement.scrollWidth <= window.innerWidth')
        ->assertNoJavaScriptErrors();
});

it('renders a generated photo for each visible product card', function () {
    visit(route('catalog', [], false))
        ->resize(1280, 900)
        ->assertCount('img[data-testid^="catalog-product-image-"]', 6)
        ->assertScript("(() => Array.from(document.querySelectorAll('img[data-testid^=\"catalog-product-image-\"]')).every((image) => image.getAttribute('src')?.startsWith('/images/products/')))()")
        ->assertAttributeContains(
            'img[data-testid="catalog-product-image-1"]',
            'src',
            '/images/products/calca-wide-leg.png',
        )
        ->assertAttribute(
            'img[data-testid="catalog-product-image-1"]',
            'alt',
            'Calça Wide Leg',
        )
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
        ->assertSee('6 produtos encontrados')
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

it('selects each physical sack once and removes it from the preview bag', function () {
    visit(route('home', [], false))
        ->resize(390, 844)
        ->click('button[aria-label="Escolher sacos de Calça Wide Leg"]')
        ->click('button[aria-label="Adicionar Saco 01"]')
        ->assertVisible('button[aria-label="Remover Saco 01 da sacola"]')
        ->click('button:has-text("Revisar sacola (1)")')
        ->assertSee('1 saco · 20 peças no total')
        ->assertSee('Esta é uma demonstração.')
        ->click('button[aria-label="Remover Saco 01 de Calça Wide Leg"]')
        ->assertSee('Sua sacola está vazia.')
        ->assertNoJavaScriptErrors();
});
