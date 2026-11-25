<?php

use App\Enums\UserRole;
use App\Models\Material;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('admin can register and edit a material while preserving its generated code', function () {
    $this->actingAs(User::factory()->admin()->create());
    $data = ['name' => 'Sarja crua', 'type' => 'fabric', 'unit' => 'm', 'is_active' => true];

    $this->from(route('materials.index'))->post(route('materials.store'), $data)
        ->assertRedirect(route('materials.index'))->assertSessionHasNoErrors();

    $material = Material::query()->sole();
    expect($material->code)->toMatch('/^INS-\d+$/');

    $this->from(route('materials.index'))->patch(route('materials.update', $material), [
        ...$data, 'name' => 'Sarja de algodão', 'is_active' => false, 'code' => 'ignored',
    ])->assertRedirect(route('materials.index'))->assertSessionHasNoErrors();

    expect($material->fresh())->code->toBe($material->code)->name->toBe('Sarja de algodão')->is_active->toBeFalse();
});

test('admin cannot save a material with missing or invalid fields', function () {
    $this->actingAs(User::factory()->admin()->create())
        ->from(route('materials.index'))->post(route('materials.store'), ['type' => 'invalid'])
        ->assertSessionHasErrors(['name', 'type', 'unit', 'is_active']);

    expect(Material::query()->count())->toBe(0);
});

test('modeling can search and read material metadata without permission to edit', function () {
    $material = Material::factory()->create(['name' => 'Zíper de náilon']);
    Material::factory()->create(['name' => 'Etiqueta']);

    $this->actingAs(User::factory()->create(['role' => UserRole::Modeling]))
        ->get(route('materials.index', ['search' => 'ziper']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('materials/index')
            ->where('auth.can.viewMaterials', true)
            ->where('canEdit', false)
            ->has('materials.data', 1, fn (Assert $row) => $row
                ->where('id', $material->id)
                ->where('name', $material->name)
                ->where('code', $material->code)
                ->where('type', $material->type->value)
                ->where('unit', $material->unit->value)
                ->where('is_active', true)));

    $this->post(route('materials.store'))->assertForbidden();
    $this->patch(route('materials.update', $material))->assertForbidden();
});

test('the materials catalog requires an authorized profile', function (UserRole $role) {
    $this->actingAs(User::factory()->create(['role' => $role]))
        ->get(route('materials.index'))->assertForbidden();
})->with([UserRole::Stock, UserRole::Marketing, UserRole::Production]);
