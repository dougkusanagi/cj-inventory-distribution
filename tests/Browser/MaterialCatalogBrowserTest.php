<?php

use App\Models\Material;
use App\Models\User;

it('registers and edits an insumo in the responsive drawer', function (int $width) {
    $this->actingAs(User::factory()->admin()->create());
    Material::factory()->create(['name' => 'Etiqueta de composição em cetim com instruções de conservação']);

    visit(route('materials.index', [], false))
        ->resize($width, 900)
        ->assertSee('Etiqueta de composição em cetim')
        ->click('Novo insumo')
        ->fill('#material-name', 'Zíper de náilon reforçado')
        ->click('#material-type')
        ->click('[role="option"]:has-text("Zíper")')
        ->click('#material-unit')
        ->click('[role="option"]:has-text("Unidade (un)")')
        ->click('Salvar insumo')
        ->assertMissing('[data-slot="drawer-content"]')
        ->assertSee('Zíper de náilon reforçado')
        ->click('button[aria-label="Editar Zíper de náilon reforçado"]')
        ->click('#material-active')
        ->click('Salvar insumo')
        ->assertSee('Inativo')
        ->assertScript('document.documentElement.scrollWidth <= window.innerWidth')
        ->assertNoJavaScriptErrors()
        ->screenshot(true, 'catalogo-insumos-'.$width);
})->with([390, 768, 1366]);
