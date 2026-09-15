<?php

use App\Models\Category;
use App\Models\User;
use Illuminate\Support\Facades\Vite;

beforeEach(function (): void {
    config(['inertia.ssr.enabled' => false]);
    Vite::useHotFile(storage_path('framework/testing-hot-file'));
});

it('creates, lists, updates, and deletes a category through the interface', function () {
    $this->actingAs(User::factory()->create());

    $page = visit(route('categories.create', [], false))
        ->assertRoute('categories.create')
        ->assertSee('Nova categoria')
        ->assertPresent('#category-name')
        ->type('#category-name', 'Calça E2E')
        ->press('Salvar categoria')
        ->assertRoute('categories.index')
        ->assertSee('Calça E2E')
        ->assertSee('Categoria cadastrada.')
        ->assertNoJavaScriptErrors();

    $category = Category::query()->sole();

    expect($category->name)->toBe('Calça E2E')
        ->and($category->slug)->toBe('calca-e2e')
        ->and($category->is_active)->toBeTrue();

    $page
        ->click('a[aria-label="Editar Calça E2E"]')
        ->assertRoute('categories.edit', [$category->id])
        ->clear('#category-name')
        ->fill('#category-name', 'Calça Atualizada E2E')
        ->press('Salvar categoria')
        ->assertRoute('categories.index')
        ->assertSee('Calça Atualizada E2E')
        ->assertSee('Categoria atualizada.')
        ->assertNoJavaScriptErrors();

    expect($category->refresh()->name)->toBe('Calça Atualizada E2E')
        ->and($category->slug)->toBe('calca-atualizada-e2e');

    $page->script('window.confirm = () => true;');

    $page
        ->click('button[aria-label="Excluir Calça Atualizada E2E"]')
        ->assertDontSee('Calça Atualizada E2E')
        ->assertSee('Categoria excluída.')
        ->assertNoJavaScriptErrors();

    $this->assertModelMissing($category);
});
