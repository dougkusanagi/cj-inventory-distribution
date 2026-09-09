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

it('selects each physical sack once and removes it from the preview bag', function () {
    visit(route('home', [], false))
        ->resize(390, 844)
        ->click('button[aria-label="Escolher sacos de Calça Wide Leg"]')
        ->click('button[aria-label="Adicionar Saco 01"]')
        ->assertDisabled('button[aria-label="Saco 01 já está na sacola"]')
        ->click('button:has-text("Revisar sacola (1)")')
        ->assertSee('1 saco · 20 peças no total')
        ->assertSee('Esta é uma demonstração.')
        ->click('button[aria-label="Remover Saco 01 de Calça Wide Leg"]')
        ->assertSee('Sua sacola está vazia.')
        ->assertNoJavaScriptErrors();
});
